/**
 * routes/donationRoutes.js
 *
 * Endpoints:
 *   GET  /api/donations/my                  → donor history
 *   POST /api/donations/create-checkout     → start Stripe checkout
 *   POST /api/donations/upi/webhook         → Stripe webhook (raw body)
 *   POST /api/donations/verify-payment      → frontend confirms after redirect
 *   GET  /api/donations/refund-requests     → admin: all pending refunds
 *   POST /api/donations/:id/refund-request  → donor submits
 *   POST /api/donations/:id/process-refund  → admin approve/reject
 */

import { Router } from 'express'
import Donation   from '../models/Donation.js'
import Campaign   from '../models/Campaign.js'
import User       from '../models/User.js'
import { protect, adminOnly } from '../middleware/auth.js'
import {
  sendRefundApprovedEmail,
  sendRefundRejectedEmail,
  sendRefundRequestedEmail,
} from '../services/emailService.js'

const router = Router()

/* ── Helper: mark donation paid + update campaign stats ─────────────────────
   Idempotent — safe to call multiple times (webhook + verify-payment).
──────────────────────────────────────────────────────────────────────────── */
async function markDonationPaid(donation, paymentIntentId) {
  if (!donation || donation.status === 'paid') return
  donation.status                = 'paid'
  donation.stripePaymentIntentId = paymentIntentId || donation.stripePaymentIntentId
  donation.paidAt                = new Date()
  await donation.save()
  await Campaign.findByIdAndUpdate(donation.campaign, {
    $inc: { amountRaised: donation.amount, raised: donation.amount, funders: 1 },
  })
  console.log('[Donation] Marked paid:', donation._id.toString(), 'amount:', donation.amount)
}

/* Find donation by Stripe session ID — checks both new stripeSessionId field
   and legacy razorpayOrderId field (used in old schema) */
async function findDonationBySession(sessionId) {
  if (!sessionId) return null
  return await Donation.findOne({
    $or: [
      { stripeSessionId:  sessionId },
      { razorpayOrderId:  sessionId },  // legacy field used before schema update
    ]
  })
}

/* ══════════════════════════════════════════════════════════════════════
   GET /my
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
   POST /create-checkout
══════════════════════════════════════════════════════════════════════ */
router.post('/create-checkout', protect, async (req, res) => {
  try {
    const { campaignId, amount, message } = req.body
    if (!campaignId || !amount || Number(amount) < 1)
      return res.status(400).json({ message: 'campaignId and amount (min 1) required' })

    const campaign = await Campaign.findOne({
      $or: [
        { contractAddress: campaignId },
        { _id: campaignId.match(/^[0-9a-fA-F]{24}$/) ? campaignId : null },
      ],
    })
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' })

    const frontendBase = (req.headers.origin || process.env.FRONTEND_URL || '').replace(/\/$/, '')
    const stripe       = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     'inr',
          product_data: { name: campaign.title, description: 'Donation to ' + campaign.title },
          unit_amount:  Math.round(Number(amount) * 100),
        },
        quantity: 1,
      }],
      mode:        'payment',
      /* {CHECKOUT_SESSION_ID} is replaced by Stripe — lets verify-payment work without localStorage */
      success_url: frontendBase + '/campaign/' + campaign.contractAddress + '?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  frontendBase + '/campaign/' + campaign.contractAddress + '?payment=cancelled',
      metadata: {
        campaignId: campaign._id.toString(),
        donorId:    req.user.id,
        amount:     amount.toString(),
        message:    message || '',
      },
    })

    await Donation.create({
      campaign:        campaign._id,
      donor:           req.user.id,
      amount:          Number(amount),
      currency:        'INR',
      paymentMethod:   'upi',
      status:          'created',
      stripeSessionId: session.id,
      razorpayOrderId: session.id,   // also save to legacy field for old schema compatibility
      message:         message || '',
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('[DonationRoute] create-checkout:', err.message)
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   POST /upi/webhook  — Stripe sends events here
   server.js already registers this path with express.raw() before json()
══════════════════════════════════════════════════════════════════════ */
router.post('/upi/webhook', async (req, res) => {
  const sig    = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  let event

  try {
    const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY)
    if (secret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, secret)
    } else {
      const raw = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body)
      event     = JSON.parse(raw)
    }
  } catch (err) {
    console.error('[Webhook] Failed:', err.message)
    return res.status(400).json({ message: 'Webhook error: ' + err.message })
  }

  console.log('[Webhook] Event:', event.type)

  try {
    if (event.type === 'checkout.session.completed') {
      const session  = event.data.object
      const donation = await findDonationBySession(session.id)
      await markDonationPaid(donation, session.payment_intent)
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent   = event.data.object
      /* Try by payment intent ID first */
      let donation = await Donation.findOne({
        $or: [
          { stripePaymentIntentId: intent.id },
          { razorpayPaymentId: intent.id },
        ]
      })
      if (!donation) {
        /* Fallback: find session linked to this payment intent */
        const stripe   = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY)
        const sessions = await stripe.checkout.sessions.list({ payment_intent: intent.id, limit: 1 })
        if (sessions.data.length) {
          donation = await findDonationBySession(sessions.data[0].id)
        }
      }
      await markDonationPaid(donation, intent.id)
    }

    if (event.type === 'checkout.session.expired') {
      await Donation.findOneAndUpdate(
        { stripeSessionId: event.data.object.id, status: 'created' },
        { status: 'failed' }
      )
    }

    if (event.type === 'payment_intent.payment_failed') {
      await Donation.findOneAndUpdate(
        { stripePaymentIntentId: event.data.object.id, status: 'created' },
        { status: 'failed' }
      )
    }
  } catch (err) {
    console.error('[Webhook] Handler error:', err.message)
  }

  res.json({ received: true })
})

/* ══════════════════════════════════════════════════════════════════════
   POST /verify-payment
   Frontend calls this on redirect back from Stripe (?payment=success).
   session_id is appended by Stripe via {CHECKOUT_SESSION_ID} in success_url.
══════════════════════════════════════════════════════════════════════ */
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' })

    const stripe  = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      const donation = await findDonationBySession(sessionId)
      if (!donation) return res.json({ success: false, message: 'Donation record not found.' })
      await markDonationPaid(donation, session.payment_intent)
      return res.json({ success: true, status: 'paid', donation })
    }

    res.json({ success: false, status: session.payment_status })
  } catch (err) {
    console.error('[VerifyPayment]:', err.message)
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   GET /refund-requests  — admin view
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
   POST /:id/refund-request  — donor submits request
══════════════════════════════════════════════════════════════════════ */
router.post('/:id/refund-request', protect, async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason?.trim())
      return res.status(400).json({ message: 'A reason is required.' })

    const donation = await Donation.findById(req.params.id)
      .populate('campaign', 'title contractAddress deadline goal paymentType')
      .populate('donor',    'name email')

    if (!donation) return res.status(404).json({ message: 'Donation not found.' })

    if (donation.donor._id.toString() !== req.user.id)
      return res.status(403).json({ message: 'You can only refund your own donations.' })

    if (donation.status !== 'paid')
      return res.status(400).json({ message: 'Only paid donations can be refunded. Current: ' + donation.status })

    if (donation.paymentMethod !== 'upi')
      return res.status(400).json({ message: 'ETH donations refund directly via smart contract.' })

    const daysSince = (Date.now() - new Date(donation.createdAt).getTime()) / 86400000
    if (daysSince > 7)
      return res.status(400).json({ message: 'Refund window expired (7 days from donation).' })

    donation.status            = 'refund_requested'
    donation.refundReason      = reason.trim()
    donation.refundRequestedAt = new Date()
    await donation.save()

    sendRefundRequestedEmail(donation).catch(e =>
      console.warn('[DonationRoute] refund-request email failed:', e.message)
    )

    res.json({ success: true, message: 'Request submitted. Review within 2-3 business days.', donation })
  } catch (err) {
    console.error('[DonationRoute] refund-request:', err.message)
    res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   POST /:id/process-refund  — admin approve or reject
══════════════════════════════════════════════════════════════════════ */
router.post('/:id/process-refund', protect, adminOnly, async (req, res) => {
  try {
    const { action, note } = req.body
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ message: 'action must be approve or reject' })
    if (action === 'reject' && !note?.trim())
      return res.status(400).json({ message: 'Reason required when rejecting.' })

    const donation = await Donation.findById(req.params.id)
      .populate('campaign', 'title contractAddress')
      .populate('donor',    'name email')

    if (!donation) return res.status(404).json({ message: 'Donation not found.' })
    if (donation.status !== 'refund_requested')
      return res.status(400).json({ message: 'Status must be refund_requested. Current: ' + donation.status })

    if (action === 'approve') {
      let stripeRefundId = null
      try {
        const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY)
        let piId     = donation.stripePaymentIntentId
        if (!piId && donation.stripeSessionId) {
          const s = await stripe.checkout.sessions.retrieve(donation.stripeSessionId)
          piId    = s.payment_intent
        }
        if (piId) {
          const intent   = await stripe.paymentIntents.retrieve(piId)
          const chargeId = intent.latest_charge
          if (chargeId) {
            const refund   = await stripe.refunds.create({ charge: chargeId })
            stripeRefundId = refund.id
          }
        }
      } catch (e) {
        console.error('[DonationRoute] Stripe refund error:', e.message)
      }

      donation.status            = 'refunded'
      donation.refundProcessedAt = new Date()
      donation.refundNote        = note?.trim() || 'Approved by admin.'
      if (stripeRefundId) donation.stripeRefundId = stripeRefundId
      await donation.save()

      sendRefundApprovedEmail(donation).catch(e =>
        console.warn('[DonationRoute] refund-approved email:', e.message)
      )
      return res.json({ success: true, message: 'Refund approved.', stripeRefundId, donation })
    }

    donation.status            = 'refund_rejected'
    donation.refundProcessedAt = new Date()
    donation.refundNote        = note.trim()
    await donation.save()

    sendRefundRejectedEmail(donation).catch(e =>
      console.warn('[DonationRoute] refund-rejected email:', e.message)
    )
    res.json({ success: true, message: 'Refund rejected.', donation })
  } catch (err) {
    console.error('[DonationRoute] process-refund:', err.message)
    res.status(500).json({ message: err.message })
  }
})

export default router
