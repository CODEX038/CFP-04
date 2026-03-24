/**
 * paymentService.js
 * Stripe integration for payments + refunds.
 * Drop-in replacement for Cashfree/Razorpay paymentService.js
 *
 * Install:  npm install stripe
 * Docs:     https://stripe.com/docs/api
 *
 * Stripe test mode requires zero KYC — just sign up and use test keys.
 * Test cards: https://stripe.com/docs/testing#cards
 * Use card: 4242 4242 4242 4242 | any future date | any CVC
 */

import Stripe from 'stripe'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY missing in .env')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
}

// ── Create Payment Intent ─────────────────────────────────────────────────────
/**
 * Equivalent to createRazorpayOrder / createCashfreeOrder
 * Returns { id, clientSecret, amount, currency }
 *
 * @param {number} amountInRupees
 * @param {string} campaignId
 * @param {string} donorId
 */
export async function createStripePaymentIntent(amountInRupees, campaignId, donorId) {
  const stripe = getStripe()

  const paymentIntent = await stripe.paymentIntents.create({
    amount:   Math.round(amountInRupees * 100),   // Stripe uses smallest unit (paise)
    currency: 'inr',
    metadata: { campaignId, donorId },
    automatic_payment_methods: { enabled: true },
  })

  return {
    id:           paymentIntent.id,              // stored as razorpayOrderId in Donation model
    clientSecret: paymentIntent.client_secret,   // sent to frontend for Stripe.js
    amount:       amountInRupees,
    currency:     'INR',
  }
}

// ── Verify Payment ────────────────────────────────────────────────────────────
/**
 * Fetch payment intent from Stripe and confirm status === 'succeeded'
 * Called after frontend confirms payment.
 *
 * @param {string} paymentIntentId
 */
export async function verifyStripePayment(paymentIntentId) {
  const stripe = getStripe()
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
  return {
    verified: intent.status === 'succeeded',
    status:   intent.status,
  }
}

// ── Webhook Verification ──────────────────────────────────────────────────────
/**
 * Verify Stripe webhook signature.
 * Express must parse this route with express.raw() — see donationRoutes.js
 *
 * @param {Buffer} rawBody
 * @param {string} signature   – req.headers['stripe-signature']
 */
export function verifyStripeWebhook(rawBody, signature) {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}

// ── Process Refund ────────────────────────────────────────────────────────────
/**
 * Equivalent to processRazorpayRefund / processCashfreeRefund
 *
 * @param {string} paymentIntentId   – stored as razorpayOrderId in Donation model
 * @param {number} amountInRupees
 * @param {string} reason
 */
export async function processStripeRefund(paymentIntentId, amountInRupees, reason = '') {
  const stripe = getStripe()

  // Need the charge ID from the payment intent
  const intent  = await stripe.paymentIntents.retrieve(paymentIntentId)
  const chargeId = intent.latest_charge

  if (!chargeId) throw new Error('No charge found for this payment intent.')

  const refund = await stripe.refunds.create({
    charge:   chargeId,
    amount:   Math.round(amountInRupees * 100),
    reason:   'requested_by_customer',
    metadata: { note: reason },
  })

  return {
    id:     refund.id,      // stored as refundId in Donation model
    status: refund.status,  // 'succeeded' | 'pending' | 'failed'
  }
}
