import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import {
  getAllCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  getMyCampaigns,
  syncCampaign,
} from '../controllers/campaignController.js'
import { uploadCampaignDocuments } from '../controllers/campaignVerificationController.js'
import { protect, adminOnly } from '../middleware/auth.js'

// ── Multer setup for campaign documents ──────────────────────────────────────
const uploadDir = 'uploads/campaign-docs'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|doc|docx/
    const ext     = path.extname(file.originalname).toLowerCase().replace('.', '')
    cb(null, allowed.test(ext))
  },
})

const router = Router()

router.get('/',                getAllCampaigns)
router.get('/owner/:address',  getMyCampaigns)
router.get('/:address',        getCampaign)
router.post('/',               createCampaign)
router.patch('/sync/:address', syncCampaign)
router.patch('/:address',      protect, adminOnly, updateCampaign)

// ── Document upload ───────────────────────────────────────────────────────────
router.post('/:id/documents',  protect, upload.fields([
  { name: 'fees_receipt',        maxCount: 1 },
  { name: 'institution_id',      maxCount: 1 },
  { name: 'marksheet',           maxCount: 1 },
  { name: 'medical_report',      maxCount: 1 },
  { name: 'hospital_bill',       maxCount: 1 },
  { name: 'patient_id',          maxCount: 1 },
  { name: 'project_proposal',    maxCount: 1 },
  { name: 'prototype_proof',     maxCount: 1 },
  { name: 'identity_proof',      maxCount: 1 },
  { name: 'project_plan',        maxCount: 1 },
  { name: 'ngo_registration',    maxCount: 1 },
  { name: 'community_proof',     maxCount: 1 },
  { name: 'budget_plan',         maxCount: 1 },
  { name: 'portfolio',           maxCount: 1 },
  { name: 'project_description', maxCount: 1 },
]), uploadCampaignDocuments)

export default router
