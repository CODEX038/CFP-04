/**
 * services/emailService.js
 * All outbound email for FundChain — uses Brevo HTTP API.
 * No SMTP / nodemailer — works on Render free tier (no IPv6/SMTP issues).
 *
 * Required env:
 *   BREVO_API_KEY        — Brevo (SendinBlue) API key
 *   EMAIL_FROM           — sender address  (default: fundchain.04@gmail.com)
 *   EMAIL_FROM_NAME      — sender name     (default: FundChain)
 *   FRONTEND_URL         — used in CTA links
 *   ADMIN_PANEL_URL      — used in admin notification links
 */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

// ── Core send helper ──────────────────────────────────────────────────────────
async function send({ to, toName = '', subject, html }) {
  const fromEmail = process.env.EMAIL_FROM      || 'fundchain.04@gmail.com'
  const fromName  = process.env.EMAIL_FROM_NAME || 'FundChain'
  const apiKey    = process.env.BREVO_API_KEY

  if (!apiKey) {
    console.error('[EmailService] BREVO_API_KEY is not set — email not sent')
    return
  }

  const res = await fetch(BREVO_URL, {
    method:  'POST',
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      apiKey,
    },
    body: JSON.stringify({
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: to, name: toName || to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Brevo API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  console.log('[EmailService] Sent:', subject, '→', to, '| messageId:', data.messageId)
  return data
}

// ── Shared base layout ────────────────────────────────────────────────────────
function htmlWrap(accentColor = '#4f46e5', title, bodyHtml) {
  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
      .container { max-width:600px; margin:40px auto; background:#fff;
                   border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
      .header { background:${accentColor}; padding:24px 32px; }
      .header h1 { color:#fff; margin:0; font-size:22px; }
      .body { padding:32px; color:#333; line-height:1.6; }
      .box { border-radius:8px; padding:16px; margin:16px 0; }
      .badge-pending  { display:inline-block; background:#fef3c7; color:#92400e;
                        padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; }
      .badge-approved { display:inline-block; background:#d1fae5; color:#065f46;
                        padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; }
      .badge-rejected { display:inline-block; background:#fee2e2; color:#991b1b;
                        padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; }
      .btn { display:inline-block; margin-top:20px; padding:12px 28px;
             background:${accentColor}; color:#fff; text-decoration:none;
             border-radius:6px; font-weight:600; }
      .footer { background:#f9fafb; padding:16px 32px; font-size:12px; color:#888; }
      table { width:100%; border-collapse:collapse; margin-top:16px; }
      td, th { padding:10px 12px; border:1px solid #e5e7eb; font-size:14px; text-align:left; }
      th { background:#f3f4f6; }
    </style></head><body>
      <div class="container">
        <div class="header"><h1>${title}</h1></div>
        <div class="body">${bodyHtml}</div>
        <div class="footer">FundChain &nbsp;|&nbsp; This is an automated message, please do not reply.</div>
      </div>
    </body></html>
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth / OTP
// ─────────────────────────────────────────────────────────────────────────────

export async function sendEmailOtp(email, otp, name = 'there') {
  const html = htmlWrap('#4f46e5', 'Email Verification OTP', `
    <p>Hello ${name},</p>
    <p>Your one-time password is:</p>
    <h2 style="letter-spacing:8px;color:#4f46e5;font-size:36px;">${otp}</h2>
    <p>This OTP expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
  `)
  await send({ to: email, toName: name, subject: 'Your FundChain Email Verification OTP', html })
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign lifecycle (admin + creator)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendAdminCampaignNotification({ adminEmail, campaign, creator }) {
  const html = htmlWrap('#4f46e5', 'New Campaign Awaiting Verification', `
    <p>Hello Admin,</p>
    <p>A new campaign has been submitted and is waiting for your review.</p>
    <table>
      <tr><th>Campaign Title</th><td>${campaign.title}</td></tr>
      <tr><th>Category</th>      <td>${campaign.category || '—'}</td></tr>
      <tr><th>Goal Amount</th>   <td>₹${Number(campaign.goal || 0).toLocaleString('en-IN')}</td></tr>
      <tr><th>Creator Name</th>  <td>${creator.name  || '—'}</td></tr>
      <tr><th>Creator Email</th> <td>${creator.email || '—'}</td></tr>
      <tr><th>Creator Phone</th> <td>${creator.phone || '—'}</td></tr>
      <tr><th>Wallet</th>        <td>${campaign.owner || '—'}</td></tr>
      <tr><th>Submitted At</th>  <td>${new Date().toLocaleString('en-IN')}</td></tr>
      <tr><th>Status</th>        <td><span class="badge-pending">Pending</span></td></tr>
    </table>
    <p>Please log in to the admin panel to review and approve or reject.</p>
    <a class="btn" href="${process.env.ADMIN_PANEL_URL || 'http://localhost:5173/admin'}">Go to Admin Panel</a>
  `)
  await send({
    to:      adminEmail,
    subject: `[Action Required] New Campaign Pending — "${campaign.title}"`,
    html,
  })
}

export async function sendCampaignApprovedEmail({ userEmail, userName, campaign }) {
  const html = htmlWrap('#10b981', 'Campaign Approved ✅', `
    <p>Hello ${userName || 'there'},</p>
    <p>Great news! Your campaign has been <strong>reviewed and approved</strong> by our team.</p>
    <table>
      <tr><th>Campaign Title</th><td>${campaign.title}</td></tr>
      <tr><th>Goal Amount</th>   <td>₹${Number(campaign.goal || 0).toLocaleString('en-IN')}</td></tr>
      <tr><th>Status</th>        <td><span class="badge-approved">Approved</span></td></tr>
    </table>
    <p>Your campaign is now <strong>live</strong> and visible to donors. Start sharing it!</p>
    <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/campaigns/${campaign.contractAddress}">
      View Your Campaign
    </a>
  `)
  await send({
    to:      userEmail,
    toName:  userName,
    subject: `🎉 Your Campaign "${campaign.title}" has been Approved!`,
    html,
  })
}

export async function sendCampaignRejectedEmail({ userEmail, userName, campaign, reason }) {
  const html = htmlWrap('#ef4444', 'Campaign Verification Update', `
    <p>Hello ${userName || 'there'},</p>
    <p>After reviewing your submission, our team was <strong>unable to approve</strong> it at this time.</p>
    <table>
      <tr><th>Campaign Title</th><td>${campaign.title}</td></tr>
      <tr><th>Status</th>        <td><span class="badge-rejected">Rejected</span></td></tr>
      <tr><th>Reason</th>        <td>${reason || 'Did not meet verification requirements.'}</td></tr>
    </table>
    <p>You may resubmit after addressing the issues above. Contact support if you have questions.</p>
    <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard">Go to Dashboard</a>
  `)
  await send({
    to:      userEmail,
    toName:  userName,
    subject: `Update on Your Campaign "${campaign.title}" — Action Required`,
    html,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Refund notifications (donation object must be populated: campaign, donor)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendRefundApprovedEmail(donation) {
  const donorName    = donation.donor?.name  || 'Donor'
  const donorEmail   = donation.donor?.email
  const campaignTitle = donation.campaign?.title || 'Campaign'

  if (!donorEmail) return console.warn('[EmailService] sendRefundApprovedEmail: no donor email')

  const html = htmlWrap('#10b981', '✅ Refund Approved', `
    <p>Dear ${donorName},</p>
    <p>Your refund request for the campaign <strong>"${campaignTitle}"</strong> has been approved.</p>
    <table>
      <tr><th>Amount</th>               <td>₹${donation.amount.toLocaleString('en-IN')}</td></tr>
      <tr><th>Original Payment Date</th><td>${new Date(donation.createdAt).toLocaleDateString('en-IN')}</td></tr>
      <tr><th>Refund Processed</th>     <td>${new Date().toLocaleDateString('en-IN')}</td></tr>
      ${donation.refundId ? `<tr><th>Refund ID</th><td>${donation.refundId}</td></tr>` : ''}
    </table>
    ${donation.refundNote ? `
      <div class="box" style="background:#eff6ff;border:1px solid #bfdbfe;">
        <strong>Admin Note:</strong> ${donation.refundNote}
      </div>
    ` : ''}
    <p><strong>The refund will be credited to your original payment method within 5-7 business days.</strong></p>
    <p>Thank you for your patience.</p>
    <p>Best regards,<br/>FundChain Team</p>
  `)

  await send({ to: donorEmail, toName: donorName, subject: 'Refund Approved — FundChain', html })
}

export async function sendRefundRejectedEmail(donation) {
  const donorName    = donation.donor?.name  || 'Donor'
  const donorEmail   = donation.donor?.email
  const campaignTitle = donation.campaign?.title || 'Campaign'

  if (!donorEmail) return console.warn('[EmailService] sendRefundRejectedEmail: no donor email')

  const html = htmlWrap('#ef4444', '❌ Refund Request Update', `
    <p>Dear ${donorName},</p>
    <p>We regret to inform you that your refund request for <strong>"${campaignTitle}"</strong> has been rejected.</p>
    <table>
      <tr><th>Amount</th><td>₹${donation.amount.toLocaleString('en-IN')}</td></tr>
      <tr><th>Date</th>  <td>${new Date(donation.createdAt).toLocaleDateString('en-IN')}</td></tr>
    </table>
    ${donation.refundNote ? `
      <div class="box" style="background:#fffbeb;border:1px solid #fde68a;">
        <strong>Reason:</strong> ${donation.refundNote}
      </div>
    ` : ''}
    <p>If you have questions, please contact our support team.</p>
    <p>Best regards,<br/>FundChain Team</p>
  `)

  await send({ to: donorEmail, toName: donorName, subject: 'Refund Request Update — FundChain', html })
}

export async function sendRefundRequestedEmail(donation) {
  // Optional: notify donor that their request was received
  const donorName    = donation.donor?.name  || 'Donor'
  const donorEmail   = donation.donor?.email
  const campaignTitle = donation.campaign?.title || 'Campaign'

  if (!donorEmail) return

  const html = htmlWrap('#f59e0b', '📋 Refund Request Received', `
    <p>Dear ${donorName},</p>
    <p>We have received your refund request for <strong>"${campaignTitle}"</strong>.</p>
    <table>
      <tr><th>Amount</th> <td>₹${donation.amount.toLocaleString('en-IN')}</td></tr>
      <tr><th>Reason</th> <td>${donation.refundReason || '—'}</td></tr>
      <tr><th>Status</th> <td><span class="badge-pending">Under Review</span></td></tr>
    </table>
    <p>Our team will process your request within <strong>2-3 business days</strong>. You will receive an email once a decision is made.</p>
    <p>Best regards,<br/>FundChain Team</p>
  `)

  await send({ to: donorEmail, toName: donorName, subject: 'Refund Request Received — FundChain', html })
}

// ── Generic send (used by campaignExpiryRoutes) ───────────────────────────────
export async function sendEmail({ to, toName, subject, html }) {
  return send({ to, toName, subject, html })
}

export default {
  sendEmail,
  sendEmailOtp,
  sendAdminCampaignNotification,
  sendCampaignApprovedEmail,
  sendCampaignRejectedEmail,
  sendRefundApprovedEmail,
  sendRefundRejectedEmail,
  sendRefundRequestedEmail,
}
