import jwt  from 'jsonwebtoken'
import User from '../models/User.js'
import { uploadFromDisk } from '../services/cloudinaryService.js'

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
      isAdmin:       user.isAdmin,
      isVerified:    user.isVerified,
      document:      user.document,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

// ─────────────────────────────────────────────────────────────────────────────
//  REGISTER
// ─────────────────────────────────────────────────────────────────────────────

export const register = async (req, res) => {
  try {
    const {
      name, username, email, password,
      phone, dob, location,
      documentType, documentHash,
    } = req.body

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' })

    const exists = await User.findOne({ email })
    if (exists)
      return res.status(409).json({ message: 'Email already registered' })

    // ── Upload profile photo to Cloudinary (if provided) ──────────────────
    let profilePhotoUrl = ''
    if (req.files?.profilePhoto?.[0]) {
      const file = req.files.profilePhoto[0]
      const { url } = await uploadFromDisk(file.path, 'fundchain/profile-photos', {
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      })
      profilePhotoUrl = url
    } else if (req.body.profilePhoto) {
      profilePhotoUrl = req.body.profilePhoto  // base64 or URL from frontend
    }

    // ── Upload identity document to Cloudinary (if provided) ──────────────
    let documentUrl = ''
    if (req.files?.document?.[0]) {
      const file = req.files.document[0]
      const { url } = await uploadFromDisk(file.path, 'fundchain/user-documents')
      documentUrl = url
    } else if (req.body.documentUrl) {
      documentUrl = req.body.documentUrl
    }

    const user = await User.create({
      emailVerified: true,
      name, username, email, password,
      phone:        phone    || '',
      dob:          dob      || '',
      location:     location || '',
      profilePhoto: profilePhotoUrl,
      document: {
        type:   documentType || '',
        hash:   documentHash || '',
        url:    documentUrl  || '',
        status: documentUrl ? 'pending' : '',
      },
    })

    const token = signToken(user)
    res.status(201).json({ token, isAdmin: user.isAdmin })
  } catch (err) {
    console.error('register error:', err)
    res.status(500).json({ message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────────────────────────────────

export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' })
    const token = signToken(user)
    res.json({ token, isAdmin: user.isAdmin })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET ME
// ─────────────────────────────────────────────────────────────────────────────

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL USERS (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  VERIFY USER DOCUMENT (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const verifyDocument = async (req, res) => {
  try {
    const { status } = req.body
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        'document.status': status,
        isVerified: status === 'verified',
      },
      { new: true }
    ).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UPLOAD USER DOCUMENT (user self-upload to Cloudinary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/upload-document
 * Allows logged-in user to upload their identity document to Cloudinary.
 * Body: multipart form with field 'document' + optional 'documentType'
 */
export const uploadUserDocument = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No document file uploaded.' })

    const { url } = await uploadFromDisk(
      req.file.path,
      'fundchain/user-documents',
      { resource_type: 'auto' }
    )

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        'document.url':    url,
        'document.type':   req.body.documentType || 'identity',
        'document.status': 'pending',
        'document.hash':   url,  // use Cloudinary URL as hash reference
      },
      { new: true }
    ).select('-password')

    res.json({ success: true, message: 'Document uploaded successfully.', documentUrl: url, user })
  } catch (err) {
    console.error('uploadUserDocument error:', err)
    res.status(500).json({ message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UPLOAD PROFILE PHOTO (user self-upload to Cloudinary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/upload-photo
 * Allows logged-in user to upload their profile photo to Cloudinary.
 */
export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No photo uploaded.' })

    const { url } = await uploadFromDisk(
      req.file.path,
      'fundchain/profile-photos',
      {
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      }
    )

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePhoto: url },
      { new: true }
    ).select('-password')

    res.json({ success: true, message: 'Profile photo updated.', profilePhotoUrl: url, user })
  } catch (err) {
    console.error('uploadProfilePhoto error:', err)
    res.status(500).json({ message: err.message })
  }
}
