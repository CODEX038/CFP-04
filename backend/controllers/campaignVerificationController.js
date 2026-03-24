/**
 * campaignVerificationController.js
 *
 * FIXES:
 * 1. uploadCampaignDocuments now saves docs to MongoDB even if Cloudinary fails
 *    (falls back to local /uploads/campaign-docs/ URL)
 * 2. getAllCampaignsForAdmin correctly populates creator from owner wallet
 * 3. All admin panel functions exported correctly
 */

import Campaign  from '../models/Campaign.js'
import User      from '../models/User.js'
import path      from 'path'

// ── Helper: try Cloudinary, fall back to local path ──────────────────────────
async function resolveFileUrl(file) {
  // Try Cloudinary only if credentials are properly set
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  const cloudinaryReady =
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_API_KEY &&
    /^\d+$/.test(CLOUDINARY_API_KEY)   // API key must be numeric

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

  // Local fallback — file already saved to disk by multer
  // Normalize path separators for URL
  const relativePath = file.path.replace(/\\/g, '/').replace(/^.*uploads\//, '')
  return `/uploads/${relativePath}`
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns/:id/documents
// Called by the frontend after campaign creation to attach verification docs
// ─────────────────────────────────────────────────────────────────────────────
export const uploadCampaignDocuments = async (req, res) => {
  try {
    const { id } = req.params

    // id can be MongoDB _id OR contractAddress
    const campaign = await Campaign.findOne({
      $or: [
        ...(id.match(/^[a-f\d]{24}$/i) ? [{ _id: id }] : []),
        { contractAddress: id.toLowerCase() },
      ],
    })

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' })
    }

    const files = req.files  // { fieldname: [File], ... }
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' })
    }

    // Human-readable names for each field
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
        // Continue — save other docs even if one fails
      }
    }

    if (savedDocs.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to process any documents.' })
    }

    // Push docs into campaign and mark as pending verification
    campaign.documents.push(...savedDocs)
    if (campaign.verificationStatus === 'unverified') {
      campaign.verificationStatus = 'pending'
    }
    await campaign.save()

    console.log(`Saved ${savedDocs.length} document(s) for campaign "${campaign.title}"`)

    return res.status(200).json({
      success: true,
      message: `${savedDocs.length} document(s) uploaded successfully.`,
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

    // Attach creator info from User collection (matched by wallet address)
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

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    const enriched = await enrichWithCreator(campaigns)
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
// PATCH /api/campaign-verification/:id/verify
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
    return res.json({ success: true, message: 'Campaign verified.', data: campaign })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/campaign-verification/:id/reject
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
    const { action, reason } = req.body   // action: 'verified' | 'rejected'

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
// Helper: enrich campaigns with creator info from User table
// ─────────────────────────────────────────────────────────────────────────────
async function enrichWithCreator(campaigns) {
  const owners = [...new Set(campaigns.map(c => c.owner?.toLowerCase()).filter(Boolean))]

  // Try matching by walletAddress field, fallback to username field
  const users = await User.find({
    $or: [
      { walletAddress: { $in: owners } },
      { username: { $in: owners } },
    ],
  }).lean()

  const userMap = {}
  users.forEach(u => {
    if (u.walletAddress) userMap[u.walletAddress.toLowerCase()] = u
    if (u.username)      userMap[u.username.toLowerCase()] = u
  })

  return campaigns.map(c => ({
    ...c,
    creator: userMap[c.owner?.toLowerCase()] || {
      name:  c.ownerName     || c.owner || 'Unknown',
      email: c.ownerUsername || '',
    },
  }))
}
