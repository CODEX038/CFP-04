/**
 * campaignVerificationRoutes.js
 * Mount at: /api/campaign-verification
 */

import express from 'express'
import {
  getPendingCampaigns,
  getAllCampaignsForAdmin,
  getCampaignForReview,
  verifyCampaign,
  rejectCampaign,
  updateDocumentStatus,
} from '../controllers/campaignVerificationController.js'
import { protect }    from '../middleware/auth.js'
import { adminOnly }  from '../middleware/auth.js'

const router = express.Router()

// All routes require admin access
router.use(protect, adminOnly)

// Get campaigns
router.get('/pending',       getPendingCampaigns)
router.get('/all',           getAllCampaignsForAdmin)
router.get('/:id',           getCampaignForReview)

// Verify / reject
router.patch('/:id/verify',              verifyCampaign)
router.patch('/:id/reject',              rejectCampaign)
router.patch('/:id/document/:docId',     updateDocumentStatus)

export default router
