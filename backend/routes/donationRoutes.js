/**
 * donationRoutes.js
 * Mount at: /api/donations
 *
 * IMPORTANT: The Stripe webhook route MUST use express.raw() to parse the body.
 * Add this to your server.js BEFORE app.use(express.json()):
 *
 *   app.use('/api/donations/upi/webhook', express.raw({ type: 'application/json' }))
 *
 * Then keep app.use(express.json()) for all other routes.
 */

import express from 'express'
import {
  createUpiOrder,
  verifyUpiPayment,
  stripeWebhook,
  recordBitcoinDonation,
  requestRefund,
  processRefund,
  getMyDonations,
  getCampaignDonations,
  getRefundRequests,
} from '../controllers/donationController.js'
import { protect, adminOnly } from '../middleware/auth.js'

const router = express.Router()

// ── Stripe Webhook (raw body — must be before any json middleware) ─────────────
router.post('/upi/webhook', stripeWebhook)

// ── Card / UPI via Stripe ─────────────────────────────────────────────────────
router.post('/upi/create-order', protect, createUpiOrder)
router.post('/upi/verify',       protect, verifyUpiPayment)

// ── Bitcoin ───────────────────────────────────────────────────────────────────
router.post('/bitcoin',          protect, recordBitcoinDonation)

// ── Refunds ───────────────────────────────────────────────────────────────────
router.post('/:id/refund-request', protect,            requestRefund)
router.post('/:id/process-refund', protect, adminOnly, processRefund)

// ── History ───────────────────────────────────────────────────────────────────
router.get('/my',                        protect,            getMyDonations)
router.get('/campaign/:campaignId',                          getCampaignDonations)
router.get('/refund-requests',           protect, adminOnly, getRefundRequests)

export default router
