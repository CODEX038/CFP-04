import Campaign from '../models/Campaign.js'
import User     from '../models/User.js'
import path     from 'path'
import { notifyUserCampaignVerified } from '../services/notificationService.js'

// ── Helper: try Cloudinary, fall back to local path ──────────────────────────
async function resolveFileUrl(file) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  const cloudinaryReady =
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_API_KEY &&
    /^\d+$/.test(CLOUDINARY_API_KEY)

  if (cloudinaryReady && file.path) {
    try {
      const { uploadFromDisk } = await import('../services/cloudinaryService.js')
      const result = await uploadFromDisk(file.path, 'campaign-docs')
      return result.url
    } catch (err) {
      console.warn(`Cloudinary upload failed for ${file.fieldname}: ${err.message}`)
      console.warn('Falling back to local file URL.')
    }
  }

  const relativePath = file.path.replace(/\\/g, '/').replace(/^.*uploads\//, '')
  return `/uploads/${relativePath}`
}

// ── Helper: find the campaign creator user ────────────────────────────────────
async function findCreator(campaign) {
  const orConditions = []

  // wallet address — skip pseudo-addresses like '0xfiat_...' and 'unknown'
  if (
    campaign.owner &&
    campaign.owner !== 'unknown' &&
    !campaign.owner.startsWith('0xfiat_')
  ) {
    orConditions.push({ walletAddress: campaign.owner.toLowerCase() })
  }

  if (campaign.ownerUsername) {
    orConditions.push({ username: campaign.ownerUsername.toLowerCase() })
  }

  // ownerEmail stored on campaign — most reliable for fiat creators
  if (campaign.ownerEmail) {
    orConditions.push({ email: campaign.ownerEmail.toLowerCase() })
  }

  if (orConditions.length === 0) return null

  const user = await User.findOne({ $or: orConditions })
  return user || null
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns/:id/documents
// ─────────────────────────────────────────────────────────────────────────────
export const uploadCampaignDocuments = async (req, res) => {
  try {
    const { id } = req.params

    const campaign = await Campaign.findOne({
      $or: [
        // MongoDB ObjectId
        ...(id.match(/^[a-f\d]{24}$/i) ? [{ _id: id }] : []),
        // Real contract address (ETH)
        ...(!id.startsWith('0xfiat_') ? [{ contractAddress: id.toLowerCase() }] : []),
        // Fiat pseudo-address — match exactly as stored
        { contractAddress: id },
      ],
    })

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' })
    }

    const files = req.files
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' })
    }

    const DOC_NAMES = {
      fees_receipt:        'Fees Receipt',
      institution_id:      'Institution ID',
      marksheet:           'Marksheet',
      medical_report:      'Medical Report',
      hospital_bill:       'Hospital Bill',
      patient_id:          'Patient ID',
      project_proposal:    'Project Proposal',
      prototype_proof:     'Prototype Proof',
      identity_proof:      'Identity Proof',
      project_plan:        'Project Plan',
      ngo_registration:    'NGO Registration',
      community_proof:     'Community Proof',
      budget_plan:         'Budget Plan',
      portfolio:           'Portfolio',
      project_description: 'Project Description',
    }

    const savedDocs = []

    for (const [fieldname, fileArray] of Object.entries(files)) {
      const file = fileArray[0]
      if (!file) continue
      try {
        const url = await resolveFileUrl(file)
        savedDocs.push({
          docId:    fieldname,
          name:     DOC_NAMES[fieldname] || fieldname,
          url,
          filename: file.filename || path.basename(file.path || ''),
          status:   'pending',
        })
      } catch (err) {
        console.error(`Failed to process ${fieldname}:`, err.message)
      }
    }

    if (savedDocs.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to process any documents.' })
    }

    campaign.documents.push(...savedDocs)
    if (campaign.verificationStatus === 'unverified') {
      campaign.verificationStatus = 'pending'
    }
    await campaign.save()

    console.log(`Saved ${savedDocs.length} document(s) for campaign "${campaign.title}"`)

    return res.status(200).json({
      success:   true,
      message:   `${savedDocs.length} document(s) uploaded successfully.`,
      documents: savedDocs,
    })
  } catch (err) {
    console.error('uploadCampaignDocuments error:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaign-verification/pending
// ─────────────────────────────────────────────────────────────────────────────
export const getPendingCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ verificationStatus: 'pending' })
      .sort({ createdAt: -1 })
      .lean()
    const enriched = await enrichWithCreator(campaigns)
    return res.json({ success: true, data: enriched })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaign-verification/all?status=pending
// ─────────────────────────────────────────────────────────────────────────────
export const getAllCampaignsForAdmin = async (req, res) => {
  try {
    const { status } = req.query
    const filter = {}
    if (status && status !== 'all') filter.verificationStatus = status

    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).lean()
    const enriched  = await enrichWithCreator(campaigns)
    return res.json({ success: true, data: enriched })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaign-verification/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getCampaignForReview = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).lean()
    if (!campaign) return res.status(404).json({ success: false, message: 'Not found.' })
    const [enriched] = await enrichWithCreator([campaign])
    return res.json({ success: true, data: enriched })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/campaign-verification/:id/verify   ← notifies user ✅
// ─────────────────────────────────────────────────────────────────────────────
export const verifyCampaign = async (req, res) => {
  try {
    const { note } = req.body

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          verificationStatus: 'verified',
          verificationNote:   note || 'Verified by admin.',
        },
      },
      { new: true }
    )
    if (!campaign) return res.status(404).json({ success: false, message: 'Not found.' })

    try {
      const user = await findCreator(campaign)
      if (user) {
        await notifyUserCampaignVerified({ campaign, user, status: 'verified' })
      } else {
        console.warn(`[verifyCampaign] No user found for campaign owner: ${campaign.owner}`)
      }
    } catch (notifyErr) {
      console.warn('[verifyCampaign] Notification failed:', notifyErr.message)
    }

    return res.json({ success: true, message: 'Campaign verified.', data: campaign })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/campaign-verification/:id/reject   ← notifies user ✅
// ─────────────────────────────────────────────────────────────────────────────
export const rejectCampaign = async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason required.' })
    }

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          verificationStatus: 'rejected',
          verificationNote:   reason,
        },
      },
      { new: true }
    )
    if (!campaign) return res.status(404).json({ success: false, message: 'Not found.' })

    try {
      const user = await findCreator(campaign)
      if (user) {
        await notifyUserCampaignVerified({ campaign, user, status: 'rejected', reason })
      } else {
        console.warn(`[rejectCampaign] No user found for campaign owner: ${campaign.owner}`)
      }
    } catch (notifyErr) {
      console.warn('[rejectCampaign] Notification failed:', notifyErr.message)
    }

    return res.json({ success: true, message: 'Campaign rejected.', data: campaign })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/campaign-verification/:id/document/:docId
// ─────────────────────────────────────────────────────────────────────────────
export const updateDocumentStatus = async (req, res) => {
  try {
    const { id, docId } = req.params
    const { action, reason } = req.body

    const campaign = await Campaign.findById(id)
    if (!campaign) return res.status(404).json({ success: false, message: 'Not found.' })

    const doc = campaign.documents.find(d => d.docId === docId)
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' })

    doc.status = action === 'verified' ? 'verified' : 'rejected'
    if (action === 'rejected' && reason) doc.rejectedReason = reason

    await campaign.save()
    return res.json({ success: true, message: `Document ${action}.`, data: campaign })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: enrich campaigns array with creator info
// Works correctly for both ETH campaigns (wallet owner) and fiat campaigns
// (pseudo-address owner, looked up by username or email instead)
// ─────────────────────────────────────────────────────────────────────────────
async function enrichWithCreator(campaigns) {
  // Collect all lookup values across all campaigns
  const wallets   = []
  const usernames = []
  const emails    = []

  for (const c of campaigns) {
    if (c.owner && c.owner !== 'unknown' && !c.owner.startsWith('0xfiat_')) {
      wallets.push(c.owner.toLowerCase())
    }
    if (c.ownerUsername) usernames.push(c.ownerUsername.toLowerCase())
    if (c.ownerEmail)    emails.push(c.ownerEmail.toLowerCase())
  }

  const orConditions = []
  if (wallets.length)   orConditions.push({ walletAddress: { $in: wallets } })
  if (usernames.length) orConditions.push({ username:      { $in: usernames } })
  if (emails.length)    orConditions.push({ email:         { $in: emails } })

  let users = []
  if (orConditions.length > 0) {
    users = await User.find({ $or: orConditions }).lean()
  }

  // Build lookup maps for fast matching
  const byWallet   = {}
  const byUsername = {}
  const byEmail    = {}

  for (const u of users) {
    if (u.walletAddress) byWallet[u.walletAddress.toLowerCase()]   = u
    if (u.username)      byUsername[u.username.toLowerCase()]       = u
    if (u.email)         byEmail[u.email.toLowerCase()]             = u
  }

  return campaigns.map(c => {
    // Try each lookup strategy in order of reliability
    const found =
      byWallet[c.owner?.toLowerCase()] ||
      byUsername[c.ownerUsername?.toLowerCase()] ||
      byEmail[c.ownerEmail?.toLowerCase()] ||
      null

    return {
      ...c,
      creator: found
        ? {
            name:  found.name  || found.username || c.ownerName || c.owner || 'Unknown',
            email: found.email || c.ownerEmail   || '',
            phone: found.phone || c.ownerPhone   || '',
          }
        : {
            // Pure fallback — use fields stored directly on the campaign
            name:  c.ownerName  || c.owner || 'Unknown',
            email: c.ownerEmail || '',
            phone: c.ownerPhone || '',
          },
    }
  })
}
