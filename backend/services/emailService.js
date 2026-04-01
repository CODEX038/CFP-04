// ── Email Service — uses Brevo HTTP API (no SMTP, works on Render free tier) ──
// Replaces nodemailer which fails on Render due to IPv6/SMTP blocking

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

async function send({ to, subject, html, toName = '' }) {
  const fromEmail = process.env.EMAIL_FROM      || process.env.SMTP_USER || 'fundchain.04@gmail.com'
  const fromName  = process.env.EMAIL_FROM_NAME || 'FundChain'
  const apiKey    = process.env.BREVO_API_KEY

  if (!apiKey) {
    console.error('BREVO_API_KEY is not set — email not sent')
    return
  }

  const payload = {
    sender:      { name: fromName, email: fromEmail },
    to:          [{ email: to, name: toName || to }],
    subject,
    htmlContent: html,
  }

  const res = await fetch(BREVO_API_URL, {
    method:  'POST',
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Brevo API error ${res.status}: ${err}`)
  }
}

function htmlWrap(title, bodyHtml) {
  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
      .container { max-width:600px; margin:40px auto; background:#fff;
                   border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
      .header { background:#4f46e5; padding:24px 32px; }
      .header h1 { color:#fff; margin:0; font-size:22px; }
      .body { padding:32px; color:#333; line-height:1.6; }
      .badge-pending  { display:inline-block; background:#fef3c7; color:#92400e;
                        padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; }
      .badge-approved { display:inline-block; background:#d1fae5; color:#065f46;
                        padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; }
      .badge-rejected { display:inline-block; background:#fee2e2; color:#991b1b;
                        padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; }
      .btn { display:inline-block; margin-top:20px; padding:12px 28px;
             background:#4f46e5; color:#fff; text-decoration:none;
             border-radius:6px; font-weight:600; }
      .footer { background:#f9fafb; padding:16px 32px; font-size:12px; color:#888; }
      table { width:100%; border-collapse:collapse; margin-top:16px; }
      td,th { padding:10px 12px; border:1px solid #e5e7eb; font-size:14px; text-align:left; }
      th { background:#f3f4f6; }
    </style></head><body>
      <div class="container">
        <div class="header"><h1>${title}</h1></div>
        <div class="body">${bodyHtml}</div>
        <div class="footer">FundChain &nbsp;|&nbsp; This is an automated message, please do not reply.</div>
      </div>
    </body></html>`
}

// ── OTP emails (used by verificationController) ───────────────────────────────
export async function sendEmailOtp(email, otp, name = 'there') {
  const html = htmlWrap('Email Verification OTP', `
    <p>Hello ${name},</p>
    <p>Your one-time password is:</p>
    <h2 style="letter-spacing:8px;color:#4f46e5;font-size:36px;">${otp}</h2>
    <p>This OTP expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
  `)
  await send({ to: email, toName: name, subject: 'Your FundChain Email Verification OTP', html })
}

// ── Admin: new campaign pending ───────────────────────────────────────────────
export async function sendAdminCampaignNotification({ adminEmail, campaign, creator }) {
  const html = htmlWrap('New Campaign Awaiting Verification', `
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
    <p>Please log in to the admin panel to review documents and approve or reject.</p>
    <a class="btn" href="${process.env.ADMIN_PANEL_URL || 'http://localhost:5173/admin'}">Go to Admin Panel</a>
  `)
  await send({
    to:      adminEmail,
    subject: `[Action Required] New Campaign Pending — "${campaign.title}"`,
    html,
  })
}

// ── User: campaign approved ───────────────────────────────────────────────────
export async function sendCampaignApprovedEmail({ userEmail, userName, campaign }) {
  const html = htmlWrap('Campaign Approved ✅', `
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

// ── User: campaign rejected ───────────────────────────────────────────────────
export async function sendCampaignRejectedEmail({ userEmail, userName, campaign, reason }) {
  const html = htmlWrap('Campaign Verification Update', `
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

export default {
  sendEmailOtp,
  sendAdminCampaignNotification,
  sendCampaignApprovedEmail,
  sendCampaignRejectedEmail,
}
