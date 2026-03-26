import twilio from 'twilio'

let client
function getClient() {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  }
  return client
}

// Ensures phone numbers are in E.164 format (+91XXXXXXXXXX for India)
function normalizePhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')           // strip non-digits
  if (phone.startsWith('+')) return phone            // already has country code
  if (digits.length === 10) return `+91${digits}`   // Indian 10-digit → +91
  return `+${digits}`                               // fallback
}

async function sendSms(to, body) {
  const normalized = normalizePhone(to)
  if (!normalized) return
  try {
    await getClient().messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalized,
      body,
    })
  } catch (err) {
    console.warn(`SMS failed to ${normalized}:`, err.message)
  }
}

// ── OTP SMS (used by verificationController) ──────────────────────────────────
export async function sendPhoneOtp(phone, otp) {
  await sendSms(phone, `[CrowdFund] Your OTP is: ${otp}. Valid for 5 minutes. Do not share.`)
}

// ── Admin: new campaign pending ───────────────────────────────────────────────
export async function sendAdminCampaignSms({ adminPhone, campaign, creator }) {
  await sendSms(
    adminPhone,
    `[CrowdFund] New campaign pending verification.\n` +
    `Title: "${campaign.title}"\n` +
    `By: ${creator.name || creator.email || campaign.owner}\n` +
    `Login to admin panel to review.`
  )
}

// ── User: campaign approved ───────────────────────────────────────────────────
export async function sendCampaignApprovedSms({ userPhone, userName, campaign }) {
  await sendSms(
    userPhone,
    `[CrowdFund] Hi ${userName || 'there'}! ` +
    `Your campaign "${campaign.title}" has been APPROVED and is now live. ` +
    `Start sharing it with donors!`
  )
}

// ── User: campaign rejected ───────────────────────────────────────────────────
export async function sendCampaignRejectedSms({ userPhone, userName, campaign, reason }) {
  await sendSms(
    userPhone,
    `[CrowdFund] Hi ${userName || 'there'}, ` +
    `your campaign "${campaign.title}" was not approved. ` +
    `Reason: ${reason || 'Did not meet requirements.'}. ` +
    `Login to resubmit.`
  )
}

export default {
  sendPhoneOtp,
  sendAdminCampaignSms,
  sendCampaignApprovedSms,
  sendCampaignRejectedSms,
}
