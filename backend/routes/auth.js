/**
 * routes/auth.js
 * Authentication, current-user, and admin user-management routes.
 *
 * Endpoints:
 *   POST  /api/auth/register                        → register new user
 *   POST  /api/auth/login                           → login, returns JWT
 *   GET   /api/auth/me                              → get current user (protected)
 *   GET   /api/auth/users                           → list all users (admin only)
 *   PATCH /api/auth/users/:userId/verify-document   → approve/reject user doc (admin only)
 */

import { Router }  from 'express'
import bcrypt      from 'bcryptjs'
import jwt         from 'jsonwebtoken'
import User        from '../models/User.js'
import { protect, adminOnly } from '../middleware/auth.js'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

// ── POST /register ────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, walletAddress } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await User.create({
      name,
      email:         email.toLowerCase(),
      password:      hashed,
      phone:         phone        || '',
      walletAddress: walletAddress || '',
    })

    const token = signToken(user._id)

    res.status(201).json({
      token,
      user: {
        _id:          user._id,
        name:         user.name,
        email:        user.email,
        phone:        user.phone,
        walletAddress: user.walletAddress,
        isVerified:   user.isVerified,
        role:         user.role,
      },
    })
  } catch (err) {
    console.error('[Auth] register error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = signToken(user._id)

    res.json({
      token,
      user: {
        _id:          user._id,
        name:         user.name,
        email:        user.email,
        phone:        user.phone,
        walletAddress: user.walletAddress,
        isVerified:   user.isVerified,
        role:         user.role,
      },
    })
  } catch (err) {
    console.error('[Auth] login error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── GET /me ───────────────────────────────────────────────────────────────────
// Returns the currently logged-in user's profile (no password).
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    console.error('[Auth] /me error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── GET /users ────────────────────────────────────────────────────────────────
// Admin: list all users sorted newest first, passwords excluded.
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    console.error('[Auth] GET /users error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── PATCH /users/:userId/verify-document ─────────────────────────────────────
// Admin: approve or reject a user's uploaded identity document.
// Body: { status: 'verified' | 'rejected' | 'pending' }
//
// IMPORTANT: user.isVerified is kept in sync with document.status —
// a user is only considered verified when their document is 'verified'.
router.patch('/users/:userId/verify-document', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params
    const { status } = req.body

    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'status must be: verified, rejected, or pending' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (!user.document?.url) {
      return res.status(400).json({ message: 'User has no document to verify' })
    }

    // Sync both fields atomically
    user.document.status = status
    user.isVerified       = status === 'verified'

    await user.save()

    res.json({
      message:    `Document ${status} successfully`,
      userId:     user._id,
      isVerified: user.isVerified,
      document:   user.document,
    })
  } catch (err) {
    console.error('[Auth] verify-document error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

export default router
