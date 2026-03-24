/**
 * auth.js (routes)
 * Cloudinary upload routes for user documents and profile photos.
 */

import { Router } from 'express'
import multer     from 'multer'
import os         from 'os'
import path       from 'path'
import {
  register,
  login,
  getMe,
  getAllUsers,
  verifyDocument,
  uploadUserDocument,
  uploadProfilePhoto,
} from '../controllers/authController.js'
import { protect, adminOnly } from '../middleware/auth.js'

const router = Router()

// ── Multer: saves to OS temp dir, then Cloudinary picks it up ────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, os.tmpdir())
    },
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname)
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
      cb(null, name)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    cb(null, allowed.includes(file.mimetype))
  },
})

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/register', register)
router.post('/login',    login)
router.get('/me',        protect, getMe)

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/users',                       protect, adminOnly, getAllUsers)
router.patch('/users/:id/verify-document', protect, adminOnly, verifyDocument)

// ── User uploads (Cloudinary) ─────────────────────────────────────────────────
router.post('/upload-document', protect, upload.single('document'),     uploadUserDocument)
router.post('/upload-photo',    protect, upload.single('profilePhoto'), uploadProfilePhoto)

export default router
