/**
 * routes/auth.js
 */

import { Router }  from 'express'
import bcrypt      from 'bcryptjs'
import jwt         from 'jsonwebtoken'
import User        from '../models/User.js'
import { protect, adminOnly } from '../middleware/auth.js'

const router = Router()

// ✅ FIX: include role + isAdmin in JWT payload
const signToken = (user) =>
  jwt.sign(
    {
      id:      user._id,
      role:    user.role    || 'user',
      isAdmin: user.role === 'admin',
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, walletAddress } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: 'name, email and password are required' })

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return res.status(409).json({ message: 'Email already registered' })

    const hashed = await bcrypt.hash(password, 12)
    const user   = await User.create({
      name, email: email.toLowerCase(), password: hashed,
      phone: phone || '', walletAddress: walletAddress || '',
    })

    const token = signToken(user)
    res.status(201).json({
      token,
      user: {
        _id: user._id, name: user.name, email: user.email,
        phone: user.phone, walletAddress: user.walletAddress,
        isVerified: user.isVerified, role: user.role,
        isAdmin: user.role === 'admin',
      },
    })
  } catch (err) {
    console.error('[Auth] register error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'email and password are required' })

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ message: 'Invalid email or password' })

    const token = signToken(user)

    res.json({
      token,
      isAdmin: user.role === 'admin',      // ✅ top-level — AuthContext reads data.isAdmin
      user: {
        _id: user._id, name: user.name, email: user.email,
        phone: user.phone, walletAddress: user.walletAddress,
        isVerified: user.isVerified, role: user.role,
        isAdmin: user.role === 'admin',    // ✅ nested fallback
      },
    })
  } catch (err) {
    console.error('[Auth] login error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.patch('/users/:userId/verify-document', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params
    const { status } = req.body
    if (!['verified', 'rejected', 'pending'].includes(status))
      return res.status(400).json({ message: 'status must be: verified, rejected, or pending' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (!user.document?.url) return res.status(400).json({ message: 'User has no document to verify' })

    user.document.status = status
    user.isVerified       = status === 'verified'
    await user.save()

    res.json({ message: `Document ${status} successfully`, userId: user._id, isVerified: user.isVerified, document: user.document })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
