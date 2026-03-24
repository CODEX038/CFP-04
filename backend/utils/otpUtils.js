import crypto  from 'crypto'
import bcrypt  from 'bcryptjs'

export const OTP_LENGTH             = 6
export const OTP_EXPIRY_MS          = 5 * 60 * 1000      // 5 minutes
export const OTP_MAX_ATTEMPTS       = 5
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000          // 1 minute

export function generateOtp() {
  const digits = crypto.randomInt(0, Math.pow(10, OTP_LENGTH))
  return String(digits).padStart(OTP_LENGTH, '0')
}

export async function hashOtp(otp) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(otp, salt)
}

export async function compareOtp(plain, hashed) {
  return bcrypt.compare(plain, hashed)
}

export function isOtpExpired(expiresAt) {
  if (!expiresAt) return true
  return new Date() > new Date(expiresAt)
}

export function isInCooldown(lastSentAt) {
  if (!lastSentAt) return false
  return Date.now() - new Date(lastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS
}

export function cooldownSecondsLeft(lastSentAt) {
  if (!lastSentAt) return 0
  const elapsed   = Date.now() - new Date(lastSentAt).getTime()
  const remaining = OTP_RESEND_COOLDOWN_MS - elapsed
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
}

export function otpExpiresAt() {
  return new Date(Date.now() + OTP_EXPIRY_MS)
}
