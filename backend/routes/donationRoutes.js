/**
 * routes/donationRoutes.js
 * Full refund system: request → admin review → approve/reject → email notify
 *
 * Endpoints:
 *   GET  /api/donations/my                         → donor's donation history
 *   POST /api/donations/create-checkout            → start UPI/Stripe payment
 *   GET  /api/donations/refund-requests            → admin: all pending refund requests
 *   POST /api/donations/:id/refund-request         → donor: submit refund request
 *   POST /api/donations/:id/process-refund         → admin: approve or reject
 */

import { Router }   from 'express'
import Donation     from '../models/Donation.js'
import Campaign     from '../models/Campaign.js'
import User         from '../models/User.js'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  sendRefundApprovedEmail,
  sendRefundRejectedEmail,
  sendRefundRequestedEmail,
} from '../services/emailService.js'

const router = Router()

/* ══════════════════════════════════════════════════════════════════════
   GET /my  — donor's donation history
══════════════════════════════════════════════════════════════════════ */
router.get('/my', protect, async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user.id })
      .populate('campaign', 'title contractAddress goal deadline paymentType imageHash')
      .sort({ createdAt: -1 })
    res.json({ success: true, data: donations })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   POST /create-checkout  — initiate UPI/Stripe payment
══════════════════════════════════════════════════════════════════════ */
router.post('/create-checkout', protect, async (req, res) => {
  try {
    const { campaignId, amount, message } = req.body

    if (!campaignId || !amount || Number(amount) < 1)
      return res.status(400).json({ message: 'campaignId and amount (min ₹1) are required' })

    const campaign = await Campaign.findOne({
      $or: [
        { _id: campaignId.match(/^[0-9a-fA-F]{24}$/) ? campaignId : null },
        { contractAddress: campaignId },
      ]
    })
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' })

    /* Stripe checkout session */
    const stripe      = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY)
    const amountPaise = Math.round(Number(amount) * 100)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     'inr',
          product_data: { name: campaign.title, description: `Donation to ${campaign.title}` },
          unit_amount:  amountPaise,
        },
        quantity: 1,
      }],
      mode:        'payment',
      success_url: `${process.env.FRONTEND_URL}/campaign/${campaign.contractAddress}?payment=success`,
      cancel_url:  `${process.env.FRONTEND_URL}/campaign/${campaign.contractAddress}?payment=cancelled`,
      metadata: {
        campaignId: campaign._id.toString(),
        donorId:    req.user.id,
        amount:     amount.toString(),
        message:    message || '',
      },
    })

    /* Create donation record in "created" state */
    await Donation.create({
      campaign:         campaign._id,
      donor:            req.user.id,
      amount:           Number(amount),
      currency:         'INR',
      paymentMethod:    'upi',
      status:           'created',
      stripeSessionId:  session.id,
      message:          message || '',
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('[DonationRoute] create-checkout error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   GET /refund-requests  — admin: all pending refund requests
══════════════════════════════════════════════════════════════════════ */
router.get('/refund-requests', protect, adminOnly, async (req, res) => {
  try {
    const donations = await Donation.find({ status: 'refund_requested' })
      .populate('campaign', 'title contractAddress goal deadline')
      .populate('donor',    'name email phone')
      .sort({ refundRequestedAt: -1 })
    res.json({ success: true, data: donations })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   POST /:id/refund-request  — donor submits refund request
══════════════════════════════════════════════════════════════════════ */
router.post('/:id/refund-request', protect, async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason?.trim())
      return res.status(400).json({ message: 'A reason is required for the refund request.' })

    const donation = await Donation.findById(req.params.id)
      .populate('campaign', 'title contractAddress deadline goal paymentType')
      .populate('donor',    'name email')

    if (!donation)
      return res.status(404).json({ message: 'Donation not found.' })

    /* Security: only the donor can request their own refund */
    if (donation.donor._id.toString() !== req.user.id)
      return res.status(403).json({ message: 'You can only request refunds for your own donations.' })

    if (donation.status !== 'paid')
      return res.status(400).json({ message: `Cannot request refund — current status is "${donation.status}".` })

    if (donation.paymentMethod !== 'upi')
      return res.status(400).json({ message: 'Refunds via this portal are only for UPI/card donations.' })

    /* 7-day refund window */
    const daysSinceDonation = (Date.now() - new Date(donation.createdAt).getTime()) / 86400000
    if (daysSinceDonation > 7)
      return res.status(400).json({ message: 'Refund window has expired (7 days from donation date).' })

    /* Update donation */
    donation.status             = 'refund_requested'
    donation.refundReason       = reason.trim()
    donation.refundRequestedAt  = new Date()
    await donation.save()

    /* Notify donor (fire-and-forget) */
    sendRefundRequestedEmail(donation).catch(e =>
      console.warn('[DonationRoute] refund-request email failed:', e.message)
    )

    res.json({
      success: true,
      message: 'Refund request submitted. Our team will review it within 2-3 business days.',
      donation,
    })
  } catch (err) {
    console.error('[DonationRoute] refund-request error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   POST /:id/process-refund  — admin approves or rejects refund
══════════════════════════════════════════════════════════════════════ */
router.post('/:id/process-refund', protect, adminOnly, async (req, res) => {
  try {
    const { action, note } = req.body  // action: "approve" | "reject"

    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ message: 'action must be "approve" or "reject"' })

    if (action === 'reject' && !note?.trim())
      return res.status(400).json({ message: 'A reason is required when rejecting a refund.' })

    const donation = await Donation.findById(req.params.id)
      .populate('campaign', 'title contractAddress')
      .populate('donor',    'name email')

    if (!donation)
      return res.status(404).json({ message: 'Donation not found.' })

    if (donation.status !== 'refund_requested')
      return res.status(400).json({ message: `Cannot process — status is "${donation.status}", expected "refund_requested".` })

    /* ── APPROVE ── */
    if (action === 'approve') {
      let stripeRefundId = null

      /* Attempt Stripe refund if payment ID exists */
      if (donation.stripePaymentIntentId || donation.stripeSessionId) {
        try {
          const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY)

          let paymentIntentId = donation.stripePaymentIntentId
          if (!paymentIntentId && donation.stripeSessionId) {
            const session    = await stripe.checkout.sessions.retrieve(donation.stripeSessionId)
            paymentIntentId  = session.payment_intent
          }

          if (paymentIntentId) {
            const refund    = await stripe.refunds.create({ payment_intent: paymentIntentId })
            stripeRefundId  = refund.id
            console.log('[DonationRoute] Stripe refund created:', stripeRefundId)
          }
        } catch (stripeErr) {
          console.error('[DonationRoute] Stripe refund failed:', stripeErr.message)
          /* Non-fatal — admin may process manually */
        }
      }

      donation.status              = 'refunded'
      donation.refundProcessedAt   = new Date()
      donation.refundNote          = note?.trim() || 'Refund approved by admin.'
      if (stripeRefundId) donation.stripeRefundId = stripeRefundId
      await donation.save()

      /* Notify donor */
      sendRefundApprovedEmail(donation).catch(e =>
        console.warn('[DonationRoute] refund-approved email failed:', e.message)
      )

      return res.json({
        success: true,
        message: 'Refund approved and processed.',
        stripeRefundId,
        donation,
      })
    }

    /* ── REJECT ── */
    donation.status            = 'refund_rejected'
    donation.refundProcessedAt = new Date()
    donation.refundNote        = note.trim()
    await donation.save()

    sendRefundRejectedEmail(donation).catch(e =>
      console.warn('[DonationRoute] refund-rejected email failed:', e.message)
    )

    res.json({
      success: true,
      message: 'Refund request rejected.',
      donation,
    })
  } catch (err) {
    console.error('[DonationRoute] process-refund error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

export default router
