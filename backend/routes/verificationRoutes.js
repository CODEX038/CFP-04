import express    from 'express'
import rateLimit  from 'express-rate-limit'
import {
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  getVerificationStatus,
} from '../controllers/verificationController.js'
import { protect } from '../middleware/auth.js'   // your existing JWT middleware

const router = express.Router()

// Max 5 OTP-send requests per 15 min per IP
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  message:  { success: false, message: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// Max 10 verify attempts per 15 min per IP
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Too many verify attempts. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// Email OTP
router.post('/send-email-otp',   otpSendLimiter,   sendEmailOtp)
router.post('/verify-email-otp', otpVerifyLimiter, verifyEmailOtp)

// Phone OTP
router.post('/send-phone-otp',   otpSendLimiter,   sendPhoneOtp)
router.post('/verify-phone-otp', otpVerifyLimiter, verifyPhoneOtp)

// Status — requires auth
router.get('/status', protect, getVerificationStatus)

export default router
