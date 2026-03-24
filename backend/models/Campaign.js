import mongoose from 'mongoose'

const CampaignDocumentSchema = new mongoose.Schema({
  docId:    { type: String, required: true },
  name:     { type: String, required: true },
  url:      { type: String, required: true },
  filename: { type: String },
  status: {
    type:    String,
    enum:    ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  rejectedReason: { type: String, default: '' },
}, { _id: false })

const CampaignSchema = new mongoose.Schema(
  {
    // ── Blockchain fields (from CreateCampaign.jsx + contractListener) ────────
    contractAddress: { type: String, required: true, unique: true, lowercase: true },
    factoryIndex:    { type: Number, default: null },
    txHash:          { type: String, default: '' },

    // ── Owner info ────────────────────────────────────────────────────────────
    owner:         { type: String, required: true, lowercase: true }, // wallet address
    ownerName:     { type: String, default: '' },
    ownerUsername: { type: String, default: '' },

    // ── Campaign details ──────────────────────────────────────────────────────
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type:    String,
      enum:    ['Education', 'Health', 'Technology', 'Environment', 'Community', 'Arts'],
      default: 'Technology',
    },
    imageHash: { type: String, default: '' },  // IPFS hash
    image:     { type: String, default: '' },  // fallback URL

    // ── Funding ───────────────────────────────────────────────────────────────
    goal:        { type: Number, required: true },
    amountRaised:{ type: Number, default: 0 },
    raised:      { type: Number, default: 0 },  // alias kept for compatibility
    funders:     { type: Number, default: 0 },
    deadline:    { type: Number, required: true }, // unix timestamp

    // ── Status ────────────────────────────────────────────────────────────────
    claimed:  { type: Boolean, default: false },
    paused:   { type: Boolean, default: false },
    isActive: { type: Boolean, default: true  },

    // ── Verification ──────────────────────────────────────────────────────────
    verificationStatus: {
      type:    String,
      enum:    ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
    },
    verificationNote: { type: String, default: '' },
    documents:        [CampaignDocumentSchema],
  },
  { timestamps: true }
)

// Index for fast lookups
CampaignSchema.index({ owner: 1 })
CampaignSchema.index({ category: 1 })

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema)
