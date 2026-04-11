/**
 * routes/donationRoutes.js
 * UPI/Card donation flow via Stripe + refund management
 *
 * Endpoints:
 *   POST /api/donations/upi/create-order     → create Stripe PaymentIntent
 *   POST /api/donations/upi/verify           → verify payment after confirmation
 *   POST /api/donations/upi/webhook          → Stripe webhook (raw body required)
 *   POST /api/donations/:id/refund-request   → donor submits refund request
 *   GET  /api/donations/refund-requests      → admin: list pending refunds
 *   POST /api/donations/:id/process-refund   → admin: approve / reject refund
 *   GET  /api/donations/my                   → donor: their donation history
 */

import { Router }     from 'express'
import Stripe         from 'stripe'
import Donation       from '../models/Donation.js'
import Campaign       from '../models/Campaign.js'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  sendRefundApprovedEmail,
  sendRefundRejectedEmail,
  sendRefundRequestedEmail,
} from '../services/emailService.js'

const router = Router()

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY missing in .env')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
}

// ── POST /upi/create-order ────────────────────────────────────────────────────
// Creates a Stripe PaymentIntent and a Donation record in 'created' state.
// Requires: { campaignId, amount (INR), message? }
router.post('/upi/create-order', protect, async (req, res) => {
  try {
    const { campaignId, amount, message = '' } = req.body

    if (!campaignId || !amount || amount < 1) {
      return res.status(400).json({ message: 'campaignId and amount (min ₹1) are required' })
    }

    const campaign = await Campaign.findById(campaignId)
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' })

    // Block donations on expired campaigns (deadline is a unix timestamp)
    const now = Math.floor(Date.now() / 1000)
    if (campaign.deadline && campaign.deadline < now) {
      return res.status(400).json({ message: 'This campaign has expired and is no longer accepting donations' })
    }

    if (!campaign.isActive || campaign.paused) {
      return res.status(400).json({ message: 'This campaign is not currently accepting donations' })
    }

    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),  // paise
      currency: 'inr',
      metadata: {
        campaignId: campaign._id.toString(),
        donorId:    req.user._id.toString(),
      },
      automatic_payment_methods: { enabled: true },
    })

    // Create Donation in 'created' state
    const donation = await Donation.create({
      campaign:         campaign._id,
      donor:            req.user._id,
      paymentMethod:    'upi',
      amount,
      currency:         'INR',
      amountInINR:      amount,
      razorpayOrderId:  paymentIntent.id,   // reusing field to store Stripe PI id
      message:          message.trim(),
      status:           'created',
    })

    res.json({
      donationId:   donation._id,
      clientSecret: paymentIntent.client_secret,
      amount,
    })
  } catch (err) {
    console.error('[DonationRoutes] create-order error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── POST /upi/verify ──────────────────────────────────────────────────────────
// Called by frontend after stripe.confirmPayment() succeeds.
// Requires: { paymentIntentId, donationId }
router.post('/upi/verify', protect, async (req, res) => {
  try {
    const { paymentIntentId, donationId } = req.body
    if (!paymentIntentId || !donationId) {
      return res.status(400).json({ message: 'paymentIntentId and donationId are required' })
    }

    const stripe = getStripe()
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ message: `Payment not successful (status: ${intent.status})` })
    }

    const donation = await Donation.findById(donationId).populate('campaign')
    if (!donation) return res.status(404).json({ message: 'Donation not found' })

    if (donation.status === 'paid') {
      return res.json({ message: 'Payment already verified', donation })
    }

    // Mark donation as paid
    donation.status           = 'paid'
    donation.razorpayPaymentId = paymentIntentId  // store confirmed PI id
    await donation.save()

    // Update campaign raised amount
    await Campaign.findByIdAndUpdate(donation.campaign._id, {
      $inc: { amountRaised: donation.amount, raised: donation.amount, funders: 1 },
    })

    res.json({ message: 'Payment verified successfully', donation })
  } catch (err) {
    console.error('[DonationRoutes] verify error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── POST /upi/webhook ─────────────────────────────────────────────────────────
// Stripe webhook — server.js MUST mount this with express.raw() BEFORE express.json()
// i.e.: app.use('/api/donations/upi/webhook', express.raw({ type: 'application/json' }))
router.post('/upi/webhook', async (req, res) => {
  const sig    = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.warn('[Webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification')
    return res.json({ received: true })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(req.body, sig, secret)
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return res.status(400).json({ message: `Webhook error: ${err.message}` })
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent   = event.data.object
      const donation = await Donation.findOne({ razorpayOrderId: intent.id })

      if (donation && donation.status === 'created') {
        donation.status            = 'paid'
        donation.razorpayPaymentId = intent.id
        await donation.save()

        await Campaign.findByIdAndUpdate(donation.campaign, {
          $inc: { amountRaised: donation.amount, raised: donation.amount, funders: 1 },
        })
        console.log('[Webhook] Donation marked paid via webhook:', donation._id)
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent   = event.data.object
      const donation = await Donation.findOne({ razorpayOrderId: intent.id })
      if (donation && donation.status === 'created') {
        donation.status = 'failed'
        await donation.save()
      }
    }
  } catch (err) {
    console.error('[Webhook] Handler error:', err.message)
  }

  res.json({ received: true })
})

// ── POST /:id/refund-request ──────────────────────────────────────────────────
// Donor submits a refund request (within 7-day window).
router.post('/:id/refund-request', protect, async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Please provide a detailed reason (min 10 characters)' })
    }

    const donation = await Donation.findById(req.params.id).populate('campaign', 'title')
    if (!donation) return res.status(404).json({ message: 'Donation not found' })

    // Ownership check
    if (donation.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (donation.status !== 'paid') {
      return res.status(400).json({ message: 'Only paid donations can be refunded' })
    }

    if (donation.paymentMethod !== 'upi') {
      return res.status(400).json({ message: 'Only UPI/card donations are eligible for refund' })
    }

    // 7-day window check
    const daysSince = (Date.now() - new Date(donation.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince > 7) {
      return res.status(400).json({ message: 'Refund window expired. Refunds must be requested within 7 days.' })
    }

    donation.status             = 'refund_requested'
    donation.refundReason       = reason.trim()
    donation.refundRequestedAt  = new Date()
    await donation.save()

    res.json({
      message: 'Refund request submitted. We will process it within 2-3 business days.',
      donation,
    })
  } catch (err) {
    console.error('[DonationRoutes] refund-request error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── GET /refund-requests ──────────────────────────────────────────────────────
// Admin: list all pending refund requests.
router.get('/refund-requests', protect, adminOnly, async (req, res) => {
  try {
    const refunds = await Donation.find({
      status:        'refund_requested',
      paymentMethod: 'upi',
    })
      .populate('campaign', 'title deadline')
      .populate('donor', 'name email')
      .sort({ refundRequestedAt: -1 })

    res.json({ data: refunds })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST /:id/process-refund ──────────────────────────────────────────────────
// Admin: approve or reject a refund request.
// Body: { action: 'approve' | 'reject', note?: string }
router.post('/:id/process-refund', protect, adminOnly, async (req, res) => {
  try {
    const { action, note } = req.body
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "approve" or "reject"' })
    }

    const donation = await Donation.findById(req.params.id)
      .populate('campaign', 'title')
      .populate('donor',   'name email')

    if (!donation)                          return res.status(404).json({ message: 'Donation not found' })
    if (donation.status !== 'refund_requested') return res.status(400).json({ message: 'No pending refund request' })

    if (action === 'approve') {
      // Issue Stripe refund
      try {
        const paymentIntentId = donation.razorpayPaymentId || donation.razorpayOrderId
        if (paymentIntentId) {
          const stripe = getStripe()
          const intent  = await stripe.paymentIntents.retrieve(paymentIntentId)
          const chargeId = intent.latest_charge

          if (chargeId) {
            const refund = await stripe.refunds.create({
              charge: chargeId,
              amount: Math.round(donation.amount * 100),
              reason: 'requested_by_customer',
            })
            donation.refundId = refund.id
          }
        }
      } catch (stripeErr) {
        console.error('[DonationRoutes] Stripe refund error:', stripeErr.message)
        return res.status(500).json({ message: 'Stripe refund failed: ' + stripeErr.message })
      }

      donation.status           = 'refunded'
      donation.refundProcessedAt = new Date()
      donation.refundNote       = note || 'Refund approved by admin'
      await donation.save()

      // Email — fire-and-forget (don't fail the request if email fails)
      sendRefundApprovedEmail(donation).catch(e =>
        console.error('[DonationRoutes] Refund approval email failed:', e.message)
      )

      return res.json({ message: `Refund approved and email sent to ${donation.donor?.email}`, donation })
    }

    // Reject
    donation.status           = 'refund_rejected'
    donation.refundProcessedAt = new Date()
    donation.refundRejectedAt  = new Date()
    donation.refundNote        = note || 'Refund request rejected'
    await donation.save()

    sendRefundRejectedEmail(donation).catch(e =>
      console.error('[DonationRoutes] Refund rejection email failed:', e.message)
    )

    res.json({ message: `Refund rejected and email sent to ${donation.donor?.email}`, donation })

  } catch (err) {
    console.error('[DonationRoutes] process-refund error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── GET /my ───────────────────────────────────────────────────────────────────
// Donor: their donation history.
router.get('/my', protect, async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate('campaign', 'title deadline paymentType')
      .sort({ createdAt: -1 })

    res.json({ data: donations })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
