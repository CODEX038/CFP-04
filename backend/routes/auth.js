/**
 * routes/auth.js
 * Fixed: register now handles multipart/form-data (sent by UserLogin.jsx createAccount)
 * The frontend sends a FormData object, so fields arrive in req.body after multer parsing.
 */

import { Router }  from 'express'
import multer      from 'multer'
import path        from 'path'
import fs          from 'fs'
import jwt         from 'jsonwebtoken'
import User        from '../models/User.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { uploadFromDisk }     from '../services/cloudinaryService.js'

const router = Router()

/* ── Multer setup for profile photo + document uploads ── */
const tmpDir = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tmpDir),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx/
    const ext     = path.extname(file.originalname).toLowerCase().replace('.', '')
    cb(null, allowed.test(ext))
  },
})

/* ── Token helper ── */
const signToken = (user) =>
  jwt.sign(
    {
      id:            user._id,
      email:         user.email,
      name:          user.name,
      username:      user.username,
      phone:         user.phone,
      dob:           user.dob,
      location:      user.location,
      profilePhoto:  user.profilePhoto,
      isAdmin:       user.isAdmin === true,
      isVerified:    user.isVerified,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

/* ══════════════════════════════════════════════════════════════════════
   POST /register
   Accepts multipart/form-data (from UserLogin.jsx FormData) OR JSON.
   Fields: name, username, email, password, phone, dob, location
   Files:  profilePhoto (optional), document (optional — handled by
           /upload-document endpoint called separately)
══════════════════════════════════════════════════════════════════════ */
router.post(
  '/register',
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'document',     maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      /* req.body is populated by multer even for multipart fields */
      const {
        name, username, email, password,
        phone, dob, location, documentType,
      } = req.body

      /* ── Validate required fields ── */
      if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ message: 'name, email and password are required' })
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' })
      }

      /* ── Duplicate email check ── */
      const existing = await User.findOne({ email: email.toLowerCase().trim() })
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' })
      }

      /* ── Upload profile photo to Cloudinary (optional) ── */
      let profilePhotoUrl = ''
      if (req.files?.profilePhoto?.[0]) {
        try {
          const { url } = await uploadFromDisk(
            req.files.profilePhoto[0].path,
            'fundchain/profile-photos',
            { transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] }
          )
          profilePhotoUrl = url
          /* Clean up temp file */
          fs.unlink(req.files.profilePhoto[0].path, () => {})
        } catch (uploadErr) {
          console.warn('[Register] Profile photo upload failed:', uploadErr.message)
          /* Non-fatal — continue without photo */
        }
      }

      /* ── Upload identity document to Cloudinary (optional) ── */
      let documentUrl = ''
      if (req.files?.document?.[0]) {
        try {
          const { url } = await uploadFromDisk(
            req.files.document[0].path,
            'fundchain/user-documents',
            { resource_type: 'auto' }
          )
          documentUrl = url
          fs.unlink(req.files.document[0].path, () => {})
        } catch (uploadErr) {
          console.warn('[Register] Document upload failed:', uploadErr.message)
        }
      }

      /* ── Create user ── */
      const user = await User.create({
        name:          name.trim(),
        username:      username?.trim() || '',
        email:         email.toLowerCase().trim(),
        password,                              /* hashed by pre-save hook */
        phone:         phone?.trim()    || '',
        dob:           dob              || '',
        location:      location?.trim() || '',
        profilePhoto:  profilePhotoUrl,
        emailVerified: true,                   /* email was verified via OTP before this call */
        document: {
          type:   documentType || '',
          hash:   documentUrl  || '',
          url:    documentUrl  || '',
          status: documentUrl ? 'pending' : '',
        },
      })

      const token = signToken(user)

      return res.status(201).json({
        token,
        isAdmin: user.isAdmin === true,
        user: {
          _id:           user._id,
          name:          user.name,
          username:      user.username,
          email:         user.email,
          phone:         user.phone,
          profilePhoto:  user.profilePhoto,
          isVerified:    user.isVerified,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          isAdmin:       user.isAdmin === true,
          document:      user.document,
        },
      })
    } catch (err) {
      console.error('[Auth] register error:', err.message)
      return res.status(500).json({ message: err.message })
    }
  }
)

/* ══════════════════════════════════════════════════════════════════════
   POST /login
══════════════════════════════════════════════════════════════════════ */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'email and password are required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' })

    const token = signToken(user)

    return res.json({
      token,
      isAdmin: user.isAdmin === true,
      user: {
        _id:           user._id,
        name:          user.name,
        username:      user.username,
        email:         user.email,
        phone:         user.phone,
        profilePhoto:  user.profilePhoto,
        isVerified:    user.isVerified,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        isAdmin:       user.isAdmin === true,
        document:      user.document,
      },
    })
  } catch (err) {
    console.error('[Auth] login error:', err.message)
    return res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   GET /me
══════════════════════════════════════════════════════════════════════ */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    return res.json(user)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   GET /users  (admin only)
══════════════════════════════════════════════════════════════════════ */
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    return res.json(users)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   PATCH /users/:userId/verify-document  (admin only)
══════════════════════════════════════════════════════════════════════ */
router.patch('/users/:userId/verify-document', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params
    const { status } = req.body

    if (!['verified', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ message: 'status must be: verified, rejected, or pending' })

    const user = await User.findById(userId)
    if (!user)              return res.status(404).json({ message: 'User not found' })
    if (!user.document?.url) return res.status(400).json({ message: 'User has no document to verify' })

    user.document.status = status
    user.isVerified       = status === 'verified'
    await user.save()

    return res.json({
      message:    `Document ${status} successfully`,
      userId:     user._id,
      isVerified: user.isVerified,
      document:   user.document,
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   POST /upload-document  (authenticated user)
   Called by UserLogin.jsx handleFinish() after account creation
══════════════════════════════════════════════════════════════════════ */
router.post(
  '/upload-document',
  protect,
  upload.single('document'),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: 'No document file uploaded.' })

      const { url } = await uploadFromDisk(
        req.file.path,
        'fundchain/user-documents',
        { resource_type: 'auto' }
      )
      fs.unlink(req.file.path, () => {})

      const user = await User.findByIdAndUpdate(
        req.user.id || req.user._id,
        {
          'document.url':    url,
          'document.type':   req.body.documentType || 'identity',
          'document.status': 'pending',
          'document.hash':   url,
        },
        { new: true }
      ).select('-password')

      return res.json({
        success:     true,
        message:     'Document uploaded successfully.',
        documentUrl: url,
        user,
      })
    } catch (err) {
      console.error('[Auth] uploadDocument error:', err.message)
      return res.status(500).json({ message: err.message })
    }
  }
)

/* ══════════════════════════════════════════════════════════════════════
   POST /upload-photo  (authenticated user)
══════════════════════════════════════════════════════════════════════ */
router.post(
  '/upload-photo',
  protect,
  upload.single('profilePhoto'),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: 'No photo uploaded.' })

      const { url } = await uploadFromDisk(
        req.file.path,
        'fundchain/profile-photos',
        { transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] }
      )
      fs.unlink(req.file.path, () => {})

      const user = await User.findByIdAndUpdate(
        req.user.id || req.user._id,
        { profilePhoto: url },
        { new: true }
      ).select('-password')

      return res.json({
        success:        true,
        message:        'Profile photo updated.',
        profilePhotoUrl: url,
        user,
      })
    } catch (err) {
      console.error('[Auth] uploadPhoto error:', err.message)
      return res.status(500).json({ message: err.message })
    }
  }
)

export default router
