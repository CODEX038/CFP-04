/**
 * notificationService.js
 * Central hub for all campaign email + SMS notifications.
 * Uses Promise.allSettled so one failure never blocks the other.
 */

import {
  sendAdminCampaignNotification,
  sendCampaignApprovedEmail,
  sendCampaignRejectedEmail,
} from './emailService.js'

import {
  sendAdminCampaignSms,
  sendCampaignApprovedSms,
  sendCampaignRejectedSms,
} from './smsService.js'

// ── Notify admin when a new campaign is submitted ─────────────────────────────
export async function notifyAdminNewCampaign({ campaign, creator }) {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPhone = process.env.ADMIN_PHONE

  if (!adminEmail && !adminPhone) {
    console.warn('[Notify] ADMIN_EMAIL and ADMIN_PHONE not set in .env — skipping admin notification')
    return
  }

  const results = await Promise.allSettled([
    adminEmail ? sendAdminCampaignNotification({ adminEmail, campaign, creator }) : Promise.resolve(),
    adminPhone ? sendAdminCampaignSms({ adminPhone, campaign, creator })          : Promise.resolve(),
  ])

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[Notify] Admin ${i === 0 ? 'email' : 'SMS'} failed:`, r.reason?.message)
    }
  })

  console.log(`[Notify] Admin alerted for new campaign: "${campaign.title}"`)
}

// ── Notify user when admin approves or rejects their campaign ─────────────────
export async function notifyUserCampaignVerified({ campaign, user, status, reason }) {
  const isApproved = status === 'verified' || status === 'approved'

  const results = await Promise.allSettled(
    isApproved
      ? [
          sendCampaignApprovedEmail({ userEmail: user.email, userName: user.name, campaign }),
          sendCampaignApprovedSms({ userPhone: user.phone,  userName: user.name, campaign }),
        ]
      : [
          sendCampaignRejectedEmail({ userEmail: user.email, userName: user.name, campaign, reason }),
          sendCampaignRejectedSms({ userPhone: user.phone,  userName: user.name, campaign, reason }),
        ]
  )

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[Notify] User ${i === 0 ? 'email' : 'SMS'} failed:`, r.reason?.message)
    }
  })

  console.log(`[Notify] User "${user.email}" notified — campaign "${campaign.title}" ${status}`)
}