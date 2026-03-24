/**
 * smsService.js
 * Sends OTP SMS via Twilio (paid account).
 * Works for ANY Indian number — no pre-verification needed.
 *
 * Cost: ~₹0.60 per SMS
 * Setup: https://console.twilio.com/us1/billing/upgrade
 */

import twilio from 'twilio'

export async function sendPhoneOtp(toPhone, otp) {
  // Normalize — ensure +91 prefix
  let mobile = toPhone.replace(/\D/g, '')
  if (mobile.length === 10) mobile = '91' + mobile
  if (!mobile.startsWith('+')) mobile = '+' + mobile

  console.log('📱 Sending OTP to:', mobile, '| OTP:', otp)

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials missing in .env')
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )

  const message = await client.messages.create({
    body: `Your ${process.env.APP_NAME || 'FundChain'} OTP is: ${otp}. Valid for 5 minutes. Do not share.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to:   mobile,
  })

  console.log('✅ SMS sent! SID:', message.sid, '| Status:', message.status)
  return message
}
