import User               from '../models/User.js'
import { sendEmailOtp as sendEmail } from '../services/emailService.js'
import { sendPhoneOtp as sendSMS }   from '../services/smsService.js'
import {
  generateOtp,
  hashOtp,
  compareOtp,
  isOtpExpired,
  isInCooldown,
  cooldownSecondsLeft,
  otpExpiresAt,
  OTP_MAX_ATTEMPTS,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
} from '../utils/otpUtils.js'

// ─────────────────────────────────────────────────────────────────────────────
//  Pre-registration OTP store (in-memory, for emails not yet in DB)
//  Map<email, { hashedOtp, expiresAt, attempts, lastSent, verified }>
// ─────────────────────────────────────────────────────────────────────────────
const preRegOtpStore = new Map()

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL
// ─────────────────────────────────────────────────────────────────────────────

export const sendEmailOtp = async (req, res) => {
  try {
    const { email, registration } = req.body
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' })

    const normalised = email.toLowerCase().trim()
    if (!/^\S+@\S+\.\S+$/.test(normalised))
      return res.status(400).json({ success: false, message: 'Invalid email format.' })

    const user = await User.findOne({ email: normalised })

    // ── Case 1: Existing user (post-login verification) ────────────────────
    if (user) {
      if (user.emailVerified)
        return res.status(400).json({ success: false, message: 'Email is already verified.' })

      if (isInCooldown(user.emailOtpLastSent)) {
        const secs = cooldownSecondsLeft(user.emailOtpLastSent)
        return res.status(429).json({ success: false, message: `Please wait ${secs}s before requesting a new OTP.`, cooldownSeconds: secs })
      }

      const otp    = generateOtp()
      const hashed = await hashOtp(otp)
      user.emailOtp         = hashed
      user.emailOtpExpires  = otpExpiresAt()
      user.emailOtpAttempts = 0
      user.emailOtpLastSent = new Date()
      await user.save()
      await sendEmail(normalised, otp, user.name)
      return res.status(200).json({ success: true, message: `OTP sent to ${normalised}. Valid for 5 minutes.` })
    }

    // ── Case 2: Pre-registration (user not in DB yet) ─────────────────────
    if (registration) {
      // Cooldown check from in-memory store
      const existing = preRegOtpStore.get(normalised)
      if (existing && Date.now() - existing.lastSent < OTP_RESEND_COOLDOWN_MS) {
        const secs = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existing.lastSent)) / 1000)
        return res.status(429).json({ success: false, message: `Please wait ${secs}s before requesting a new OTP.`, cooldownSeconds: secs })
      }

      const otp    = generateOtp()
      const hashed = await hashOtp(otp)
      preRegOtpStore.set(normalised, {
        hashedOtp: hashed,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        attempts:  0,
        lastSent:  Date.now(),
        verified:  false,
      })

      await sendEmail(normalised, otp, 'there')
      return res.status(200).json({ success: true, message: `OTP sent to ${normalised}. Valid for 5 minutes.` })
    }

    return res.status(404).json({ success: false, message: 'User not found.' })
  } catch (err) {
    console.error('sendEmailOtp error:', err)
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' })
  }
}

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp, registration } = req.body
    if (!email || !otp)
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' })

    const normalised = email.toLowerCase().trim()

    // ── Case 1: Pre-registration verify ───────────────────────────────────
    if (registration) {
      const stored = preRegOtpStore.get(normalised)
      if (!stored) return res.status(400).json({ success: false, message: 'No OTP found. Please request one first.' })

      if (stored.attempts >= OTP_MAX_ATTEMPTS)
        return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP.' })

      if (Date.now() > stored.expiresAt)
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' })

      const isMatch = await compareOtp(String(otp).trim(), stored.hashedOtp)
      if (!isMatch) {
        stored.attempts += 1
        preRegOtpStore.set(normalised, stored)
        const remaining = OTP_MAX_ATTEMPTS - stored.attempts
        return res.status(400).json({ success: false, message: `Incorrect OTP. ${remaining} attempt(s) remaining.`, attemptsLeft: remaining })
      }

      // ✅ Mark as verified in store
      preRegOtpStore.set(normalised, { ...stored, verified: true })
      return res.status(200).json({ success: true, message: 'Email verified successfully!' })
    }

    // ── Case 2: Existing user verify ──────────────────────────────────────
    const user = await User.findOne({ email: normalised }).select('+emailOtp')
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    if (user.emailVerified)
      return res.status(400).json({ success: false, message: 'Email is already verified.' })

    if (user.emailOtpAttempts >= OTP_MAX_ATTEMPTS)
      return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP.' })

    if (isOtpExpired(user.emailOtpExpires))
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' })

    if (!user.emailOtp)
      return res.status(400).json({ success: false, message: 'No OTP found. Please request one first.' })

    const isMatch = await compareOtp(String(otp).trim(), user.emailOtp)
    if (!isMatch) {
      user.emailOtpAttempts += 1
      await user.save()
      const remaining = OTP_MAX_ATTEMPTS - user.emailOtpAttempts
      return res.status(400).json({ success: false, message: `Incorrect OTP. ${remaining} attempt(s) remaining.`, attemptsLeft: remaining })
    }

    user.emailVerified     = true
    user.emailOtp          = null
    user.emailOtpExpires   = null
    user.emailOtpAttempts  = 0
    user.emailOtpLastSent  = null
    await user.save()

    return res.status(200).json({ success: true, message: 'Email verified successfully!' })
  } catch (err) {
    console.error('verifyEmailOtp error:', err)
    return res.status(500).json({ success: false, message: 'Verification failed. Please try again.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PHONE
// ─────────────────────────────────────────────────────────────────────────────

export const sendPhoneOtp = async (req, res) => {
  try {
    const { phone, userId, email } = req.body
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' })

    if (!/^\+?[1-9]\d{7,14}$/.test(phone.trim()))
      return res.status(400).json({ success: false, message: 'Invalid phone format. Use international format e.g. +919876543210.' })

    const normalised = phone.trim()

    // ✅ Only block if phone is VERIFIED by a DIFFERENT user
    const existingPhone = await User.findOne({ phone: normalised, phoneVerified: true })
    if (existingPhone && existingPhone._id.toString() !== (userId || '').toString())
      return res.status(400).json({ success: false, message: 'This phone number is already registered.' })

    // Resolve user — try req.user → userId → email → phone
    let user
    if (req.user)    user = await User.findById(req.user.id)
    else if (userId) user = await User.findById(userId)
    else if (email)  user = await User.findOne({ email: email.toLowerCase().trim() })
    else             user = await User.findOne({ phone: normalised })

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    if (user.phoneVerified)
      return res.status(400).json({ success: false, message: 'Phone is already verified.' })

    if (isInCooldown(user.phoneOtpLastSent)) {
      const secs = cooldownSecondsLeft(user.phoneOtpLastSent)
      return res.status(429).json({ success: false, message: `Please wait ${secs}s before requesting a new OTP.`, cooldownSeconds: secs })
    }

    const otp    = generateOtp()
    const hashed = await hashOtp(otp)

    user.phone            = normalised
    user.phoneOtp         = hashed
    user.phoneOtpExpires  = otpExpiresAt()
    user.phoneOtpAttempts = 0
    user.phoneOtpLastSent = new Date()
    await user.save()

    await sendSMS(normalised, otp)

    return res.status(200).json({ success: true, message: `OTP sent to ${normalised}. Valid for 5 minutes.` })
  } catch (err) {
    console.error('sendPhoneOtp error:', err)
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' })
  }
}

export const verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body
    if (!phone || !otp)
      return res.status(400).json({ success: false, message: 'Phone and OTP are required.' })

    const normalised = phone.trim()
    const user = await User.findOne({ phone: normalised }).select('+phoneOtp')
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    if (user.phoneVerified)
      return res.status(400).json({ success: false, message: 'Phone is already verified.' })

    if (user.phoneOtpAttempts >= OTP_MAX_ATTEMPTS)
      return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP.' })

    if (isOtpExpired(user.phoneOtpExpires))
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' })

    if (!user.phoneOtp)
      return res.status(400).json({ success: false, message: 'No OTP found. Please request one first.' })

    const isMatch = await compareOtp(String(otp).trim(), user.phoneOtp)
    if (!isMatch) {
      user.phoneOtpAttempts += 1
      await user.save()
      const remaining = OTP_MAX_ATTEMPTS - user.phoneOtpAttempts
      return res.status(400).json({ success: false, message: `Incorrect OTP. ${remaining} attempt(s) remaining.`, attemptsLeft: remaining })
    }

    user.phoneVerified    = true
    user.phoneOtp         = null
    user.phoneOtpExpires  = null
    user.phoneOtpAttempts = 0
    user.phoneOtpLastSent = null
    await user.save()

    return res.status(200).json({ success: true, message: 'Phone verified successfully!' })
  } catch (err) {
    console.error('verifyPhoneOtp error:', err)
    return res.status(500).json({ success: false, message: 'Verification failed. Please try again.' })
  }
}

export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'emailVerified phoneVerified email phone emailOtpLastSent phoneOtpLastSent'
    )
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })

    return res.status(200).json({
      success: true,
      data: {
        email:             user.email,
        phone:             user.phone,
        emailVerified:     user.emailVerified,
        phoneVerified:     user.phoneVerified,
        emailCooldownLeft: cooldownSecondsLeft(user.emailOtpLastSent),
        phoneCooldownLeft: cooldownSecondsLeft(user.phoneOtpLastSent),
        canCreateCampaign: user.canCreateCampaign(),
        canDonate:         user.canDonate(),
      },
    })
  } catch (err) {
    console.error('getVerificationStatus error:', err)
    return res.status(500).json({ success: false, message: 'Server error.' })
  }
}
