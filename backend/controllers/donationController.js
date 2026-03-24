/**
 * donationController.js
 * Payments via Stripe + Bitcoin donations and refund system.
 * Model, routes, Bitcoin logic, and refund flow are unchanged.
 */

import Donation from '../models/Donation.js'
import Campaign from '../models/Campaign.js'
import {
  createStripePaymentIntent,
  verifyStripePayment,
  verifyStripeWebhook,
  processStripeRefund,
} from '../services/paymentService.js'

// ─────────────────────────────────────────────────────────────────────────────
//  UPI/Card — Create Stripe Payment Intent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/donations/upi/create-order
 * Body: { campaignId, amount, message? }
 */
export const createUpiOrder = async (req, res) => {
  try {
    const { campaignId, amount, message } = req.body
    if (!campaignId || !amount || amount < 1)
      return res.status(400).json({ success: false, message: 'Campaign ID and amount (min ₹1) are required.' })

    const campaign = await Campaign.findById(campaignId)
    if (!campaign)
      return res.status(404).json({ success: false, message: 'Campaign not found.' })

    const intent = await createStripePaymentIntent(amount, campaignId, req.user.id)

    const donation = await Donation.create({
      campaign:        campaignId,
      donor:           req.user.id,
      paymentMethod:   'upi',
      amount,
      currency:        'INR',
      amountInINR:     amount,
      razorpayOrderId: intent.id,    // stores Stripe paymentIntentId
      message:         message || '',
      status:          'created',
    })

    res.status(201).json({
      success:      true,
      clientSecret: intent.clientSecret,   // frontend uses this for Stripe.js
      paymentIntentId: intent.id,
      amount:       intent.amount,
      currency:     intent.currency,
      donationId:   donation._id,
    })
  } catch (err) {
    console.error('createUpiOrder error:', err)
    res.status(500).json({ success: false, message: 'Failed to create payment.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UPI/Card — Verify Payment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/donations/upi/verify
 * Body: { paymentIntentId, donationId }
 * Called by frontend after Stripe.confirmPayment() resolves.
 */
export const verifyUpiPayment = async (req, res) => {
  try {
    const { paymentIntentId, donationId } = req.body

    const { verified } = await verifyStripePayment(paymentIntentId)

    if (!verified)
      return res.status(400).json({ success: false, message: 'Payment not completed yet.' })

    const donation = await Donation.findByIdAndUpdate(
      donationId,
      {
        razorpayPaymentId: paymentIntentId,   // reusing field — stores Stripe paymentIntentId
        status:            'paid',
      },
      { new: true }
    )

    if (!donation)
      return res.status(404).json({ success: false, message: 'Donation not found.' })

    await Campaign.findByIdAndUpdate(donation.campaign, {
      $inc: { raised: donation.amount },
    })

    res.status(200).json({
      success:    true,
      message:    `Thank you! ₹${donation.amount} donated successfully.`,
      donationId: donation._id,
      amount:     donation.amount,
    })
  } catch (err) {
    console.error('verifyUpiPayment error:', err)
    res.status(500).json({ success: false, message: 'Payment verification failed.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stripe Webhook (optional but recommended for production)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/donations/upi/webhook
 * Register this URL in Stripe Dashboard → Webhooks
 * IMPORTANT: This route must use express.raw() middleware — see donationRoutes.js
 */
export const stripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature']
    const event     = verifyStripeWebhook(req.body, signature)

    if (event.type === 'payment_intent.succeeded') {
      const intent   = event.data.object
      const donation = await Donation.findOne({ razorpayOrderId: intent.id })

      if (donation && donation.status !== 'paid') {
        donation.razorpayPaymentId = intent.id
        donation.status            = 'paid'
        await donation.save()
        await Campaign.findByIdAndUpdate(donation.campaign, { $inc: { raised: donation.amount } })
      }
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('stripeWebhook error:', err.message)
    res.status(400).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BITCOIN — Record donation (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/donations/bitcoin
 * Body: { campaignId, bitcoinTxHash, bitcoinAmountBTC, amountInINR, message? }
 */
export const recordBitcoinDonation = async (req, res) => {
  try {
    const { campaignId, bitcoinTxHash, bitcoinAmountBTC, amountInINR, message } = req.body

    if (!campaignId || !bitcoinTxHash || !bitcoinAmountBTC)
      return res.status(400).json({ success: false, message: 'Campaign ID, tx hash, and BTC amount are required.' })

    const existing = await Donation.findOne({ bitcoinTxHash })
    if (existing)
      return res.status(409).json({ success: false, message: 'This Bitcoin transaction has already been recorded.' })

    const campaign = await Campaign.findById(campaignId)
    if (!campaign)
      return res.status(404).json({ success: false, message: 'Campaign not found.' })

    const donation = await Donation.create({
      campaign:         campaignId,
      donor:            req.user.id,
      paymentMethod:    'bitcoin',
      amount:           amountInINR || 0,
      currency:         'INR',
      amountInINR:      amountInINR || 0,
      bitcoinTxHash,
      bitcoinAmountBTC,
      status:           'paid',
      message:          message || '',
    })

    if (amountInINR) {
      await Campaign.findByIdAndUpdate(campaignId, { $inc: { raised: amountInINR } })
    }

    res.status(201).json({
      success:    true,
      message:    'Bitcoin donation recorded! Thank you for your contribution.',
      donationId: donation._id,
    })
  } catch (err) {
    console.error('recordBitcoinDonation error:', err)
    res.status(500).json({ success: false, message: 'Failed to record Bitcoin donation.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  REFUND — Request (donor, unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export const requestRefund = async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason?.trim())
      return res.status(400).json({ success: false, message: 'Please provide a reason for the refund.' })

    const donation = await Donation.findOne({ _id: req.params.id, donor: req.user.id })
    if (!donation)
      return res.status(404).json({ success: false, message: 'Donation not found.' })

    if (donation.status !== 'paid')
      return res.status(400).json({ success: false, message: `Cannot request refund. Current status: ${donation.status}` })

    if (donation.paymentMethod !== 'upi')
      return res.status(400).json({
        success: false,
        message: 'Bitcoin donations cannot be automatically refunded. Please contact support.',
      })

    const daysSinceDonation = (Date.now() - new Date(donation.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceDonation > 7)
      return res.status(400).json({
        success: false,
        message: 'Refund window has expired. Refunds are only allowed within 7 days of donation.',
      })

    donation.status            = 'refund_requested'
    donation.refundRequestedAt = new Date()
    donation.refundReason      = reason
    await donation.save()

    res.status(200).json({
      success: true,
      message: 'Refund request submitted. Admin will process it within 2-3 business days.',
    })
  } catch (err) {
    console.error('requestRefund error:', err)
    res.status(500).json({ success: false, message: 'Failed to submit refund request.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  REFUND — Process (admin, now uses Stripe)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/donations/:id/process-refund
 * Body: { action: 'approve' | 'reject', note? }
 */
export const processRefund = async (req, res) => {
  try {
    const { action, note } = req.body
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'Action must be approve or reject.' })

    const donation = await Donation.findById(req.params.id)
    if (!donation)
      return res.status(404).json({ success: false, message: 'Donation not found.' })

    if (donation.status !== 'refund_requested')
      return res.status(400).json({ success: false, message: 'This donation has no pending refund request.' })

    if (action === 'reject') {
      donation.status           = 'refund_rejected'
      donation.refundNote       = note || 'Refund rejected by admin.'
      donation.refundRejectedAt = new Date()
      await donation.save()
      return res.status(200).json({ success: true, message: 'Refund request rejected.' })
    }

    // ── Approve: process via Stripe ───────────────────────────────────────────
    // razorpayOrderId stores the Stripe paymentIntentId
    if (!donation.razorpayOrderId)
      return res.status(400).json({ success: false, message: 'Stripe payment intent ID not found for this donation.' })

    const refund = await processStripeRefund(
      donation.razorpayOrderId,
      donation.amount,
      note || donation.refundReason
    )

    await Campaign.findByIdAndUpdate(donation.campaign, {
      $inc: { raised: -donation.amount },
    })

    donation.status            = 'refunded'
    donation.refundProcessedAt = new Date()
    donation.refundId          = refund.id
    donation.refundNote        = note || 'Refund approved and processed.'
    await donation.save()

    res.status(200).json({
      success:  true,
      message:  `Refund of ₹${donation.amount} processed successfully.`,
      refundId: refund.id,
    })
  } catch (err) {
    console.error('processRefund error:', err)
    res.status(500).json({ success: false, message: `Refund processing failed: ${err.message}` })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET — Donation history (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user.id })
      .populate('campaign', 'title image category')
      .sort({ createdAt: -1 })
    res.json({ success: true, data: donations })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getCampaignDonations = async (req, res) => {
  try {
    const donations = await Donation.find({
      campaign: req.params.campaignId,
      status:   { $in: ['paid', 'refund_requested', 'refunded'] },
    })
      .populate('donor', 'name username profilePhoto')
      .sort({ createdAt: -1 })
    res.json({ success: true, data: donations })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getRefundRequests = async (req, res) => {
  try {
    const donations = await Donation.find({ status: 'refund_requested' })
      .populate('donor',    'name email username')
      .populate('campaign', 'title')
      .sort({ refundRequestedAt: -1 })
    res.json({ success: true, count: donations.length, data: donations })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
