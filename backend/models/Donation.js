/**
 * models/Donation.js
 * Updated to support Stripe (replaces Razorpay fields).
 * Backwards compatible — keeps razorpay fields so old records don't break.
 */

import mongoose from 'mongoose'

const DonationSchema = new mongoose.Schema(
  {
    campaign: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Campaign',
      required: true,
    },
    donor: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    paymentMethod: {
      type:    String,
      enum:    ['eth', 'upi', 'card', 'bitcoin'],
      default: 'upi',
    },
    amount: {
      type:    Number,
      default: 0,
    },
    currency: {
      type:    String,
      default: 'INR',
    },
    amountInINR: {
      type:    Number,
      default: 0,
    },

    /* ── Stripe fields ── */
    stripeSessionId: {
      type:    String,
      default: null,
      index:   true,       // indexed for fast webhook lookup
    },
    stripePaymentIntentId: {
      type:    String,
      default: null,
      index:   true,
    },
    stripeRefundId: {
      type:    String,
      default: null,
    },
    paidAt: {
      type:    Date,
      default: null,
    },

    /* ── Legacy Razorpay fields (kept for backwards compatibility) ── */
    razorpayOrderId: {
      type:    String,
      default: null,
    },
    razorpayPaymentId: {
      type:    String,
      default: null,
    },
    razorpaySignature: {
      type:    String,
      default: null,
    },

    /* ── Bitcoin (unused but kept) ── */
    bitcoinAddress: {
      type:    String,
      default: '',
    },
    bitcoinTxHash: {
      type:    String,
      default: '',
    },
    bitcoinAmountBTC: {
      type:    Number,
      default: 0,
    },

    /* ── Status ── */
    status: {
      type:    String,
      enum:    ['created', 'paid', 'failed', 'refund_requested', 'refunded', 'refund_rejected'],
      default: 'created',
      index:   true,
    },

    /* ── Refund ── */
    refundRequestedAt:  { type: Date,   default: null },
    refundReason:       { type: String, default: ''   },
    refundProcessedAt:  { type: Date,   default: null },
    refundId:           { type: String, default: ''   },
    refundNote:         { type: String, default: ''   },
    refundRejectedAt:   { type: Date,   default: null },

    /* ── Message from donor ── */
    message: {
      type:    String,
      default: '',
    },
  },
  { timestamps: true }
)

export default mongoose.models.Donation || mongoose.model('Donation', DonationSchema)
