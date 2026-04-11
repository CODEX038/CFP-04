/**
 * routes/campaignExpiryRoutes.js
 * Campaign expiry detection and automated donor notification.
 *
 * Endpoints:
 *   GET  /api/campaigns/check-expired/:campaignId  → check if a campaign is expired
 *   POST /api/campaigns/process-expired-campaigns  → cron / admin trigger
 */

import { Router } from 'express'
import Campaign   from '../models/Campaign.js'
import Donation   from '../models/Donation.js'
import { sendEmail } from '../services/emailService.js'

const router = Router()

// ── GET /check-expired/:campaignId ────────────────────────────────────────────
// Returns { expired, deadline, canDonate }
// Campaign.deadline is stored as a unix timestamp (Number).
router.get('/check-expired/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId)
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' })

    const nowUnix  = Math.floor(Date.now() / 1000)
    const isExpired = campaign.deadline ? campaign.deadline < nowUnix : false

    res.json({
      expired:   isExpired,
      deadline:  campaign.deadline,
      canDonate: !isExpired && campaign.isActive && !campaign.paused,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── POST /process-expired-campaigns ──────────────────────────────────────────
// Called by the daily cron job or manually by an admin.
// Finds campaigns whose deadline has passed and haven't been marked expired yet,
// notifies donors, and marks the campaign isActive = false.
//
// Security: validate ADMIN_CRON_TOKEN in the Authorization header.
router.post('/process-expired-campaigns', async (req, res) => {
  // Token guard — cron job sends Bearer <ADMIN_CRON_TOKEN>
  const authHeader = req.headers.authorization || ''
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (process.env.ADMIN_CRON_TOKEN && token !== process.env.ADMIN_CRON_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const nowUnix = Math.floor(Date.now() / 1000)

    // Find fiat campaigns that expired but are still marked as active
    const expiredCampaigns = await Campaign.find({
      paymentType: 'fiat',
      isActive:    true,
      deadline:    { $lt: nowUnix },
    })

    let processedCount = 0
    let emailsSent     = 0
    const errors       = []

    for (const campaign of expiredCampaigns) {
      try {
        // Find all paid UPI donations for this campaign
        const paidDonations = await Donation.find({
          campaign:      campaign._id,
          status:        'paid',
          paymentMethod: 'upi',
        }).populate('donor', 'email name')

        // Notify each donor
        for (const donation of paidDonations) {
          if (!donation.donor?.email) continue
          try {
            await sendEmail({
              to:      donation.donor.email,
              toName:  donation.donor.name,
              subject: `Campaign Expired: ${campaign.title}`,
              html: buildExpiryEmail({ campaign, donation }),
            })
            emailsSent++
          } catch (emailErr) {
            console.error(`[ExpiryRoute] Email failed for ${donation.donor.email}:`, emailErr.message)
            errors.push({ donationId: donation._id, email: donation.donor.email, error: emailErr.message })
          }
        }

        // Mark campaign as inactive / expired
        campaign.isActive = false
        await campaign.save()
        processedCount++

      } catch (campaignErr) {
        console.error(`[ExpiryRoute] Error processing campaign ${campaign._id}:`, campaignErr.message)
        errors.push({ campaignId: campaign._id, error: campaignErr.message })
      }
    }

    res.json({
      message:            'Expired campaigns processed',
      totalExpired:       expiredCampaigns.length,
      processedCampaigns: processedCount,
      emailsSent,
      ...(errors.length > 0 && { errors }),
    })

  } catch (err) {
    console.error('[ExpiryRoute] process-expired-campaigns error:', err.message)
    res.status(500).json({ message: err.message })
  }
})

// ── Email template ────────────────────────────────────────────────────────────
function buildExpiryEmail({ campaign, donation }) {
  const deadlineDate = new Date(campaign.deadline * 1000).toLocaleDateString('en-IN')
  const donatedDate  = new Date(donation.createdAt).toLocaleDateString('en-IN')

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
      .container { max-width:600px; margin:40px auto; background:#fff;
                   border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
      .header { background:#ef4444; padding:24px 32px; }
      .header h1 { color:#fff; margin:0; font-size:22px; }
      .body { padding:32px; color:#333; line-height:1.6; }
      .box { border-radius:8px; padding:16px; margin:16px 0; }
      .box-red    { background:#fef2f2; border:1px solid #fecaca; }
      .box-amber  { background:#fff7ed; border:1px solid #fed7aa; }
      ol { color:#9a3412; margin:0; padding-left:20px; }
      .footer { background:#f9fafb; padding:16px 32px; font-size:12px; color:#888; }
      .warn { color:#dc2626; font-weight:bold; }
    </style></head><body>
      <div class="container">
        <div class="header"><h1>⚠️ Campaign Expired</h1></div>
        <div class="body">
          <p>Dear ${donation.donor.name},</p>
          <p>The campaign <strong>"${campaign.title}"</strong> expired on ${deadlineDate} and is no longer accepting donations.</p>

          <div class="box box-red">
            <strong>Your Donation Details</strong><br/>
            Amount: ₹${donation.amount.toLocaleString('en-IN')}<br/>
            Date: ${donatedDate}<br/>
            Payment ID: ${donation.razorpayPaymentId || 'N/A'}
          </div>

          <div class="box box-amber">
            <strong>💡 How to request a refund:</strong>
            <ol>
              <li>Log in to your account</li>
              <li>Go to <strong>My Donations</strong></li>
              <li>Find this donation and click <strong>Request Refund</strong></li>
              <li>Provide a reason — our team will process it within 2-3 business days</li>
            </ol>
          </div>

          <p class="warn">⚠️ Refund requests must be submitted within 7 days of your donation date.</p>
          <p>If you have questions, please contact our support team.</p>
          <p>Best regards,<br/>FundChain Team</p>
        </div>
        <div class="footer">FundChain &nbsp;|&nbsp; This is an automated message, please do not reply.</div>
      </div>
    </body></html>
  `
}

export default router
