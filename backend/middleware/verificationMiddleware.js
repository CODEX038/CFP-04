import User from '../models/User.js'

export const requireEmailVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized.' })

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before continuing.',
        redirectTo: '/verify/email',
        code: 'EMAIL_NOT_VERIFIED',
      })
    }
    next()
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

export const requirePhoneVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized.' })

    if (!user.phoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your phone number before continuing.',
        redirectTo: '/verify/phone',
        code: 'PHONE_NOT_VERIFIED',
      })
    }
    next()
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}

export const requireFullyVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized.' })

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before creating a campaign.',
        redirectTo: '/verify/email',
        code: 'EMAIL_NOT_VERIFIED',
      })
    }
    if (!user.phoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your phone number before creating a campaign.',
        redirectTo: '/verify/phone',
        code: 'PHONE_NOT_VERIFIED',
      })
    }
    next()
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}
