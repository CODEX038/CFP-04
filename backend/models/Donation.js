import mongoose from 'mongoose'

const DonationSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    donor:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },

    // ── Payment method ────────────────────────────────────────────────────────
    paymentMethod: {
      type:     String,
      enum:     ['upi', 'bitcoin'],
      required: true,
    },

    // ── Amount ────────────────────────────────────────────────────────────────
    amount:      { type: Number, required: true },  // INR for UPI, USD for Bitcoin
    currency:    { type: String, default: 'INR' },  // INR | USD
    amountInINR: { type: Number, default: 0 },      // normalized to INR for records

    // ── UPI (Razorpay) ────────────────────────────────────────────────────────
    razorpayOrderId:   { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    // ── Bitcoin ───────────────────────────────────────────────────────────────
    bitcoinAddress:   { type: String, default: '' },
    bitcoinTxHash:    { type: String, default: '' },
    bitcoinAmountBTC: { type: Number, default: 0  },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['created', 'paid', 'failed', 'refund_requested', 'refunded', 'refund_rejected'],
      default: 'created',
    },

    // ── Refund ────────────────────────────────────────────────────────────────
    refundRequestedAt: { type: Date,   default: null },
    refundReason:      { type: String, default: ''   },
    refundProcessedAt: { type: Date,   default: null },
    refundId:          { type: String, default: ''   },  // Razorpay refund ID
    refundNote:        { type: String, default: ''   },  // Admin note
    refundRejectedAt:  { type: Date,   default: null },

    message: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('Donation', DonationSchema)
