import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmailOtp(toEmail, otp, userName = 'there') {
  const transporter = createTransporter()

  await transporter.sendMail({
    from:    `"${process.env.APP_NAME || 'CrowdFund'}" <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: `Your verification code is ${otp}`,
    text:    `Hi ${userName},\n\nYour OTP is: ${otp}\nExpires in 5 minutes.\n\nDo not share this code.\n\n— ${process.env.APP_NAME || 'CrowdFund'} Team`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" />
          <style>
            body{font-family:'Segoe UI',sans-serif;background:#f4f4f4;margin:0;padding:0}
            .container{max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
            .header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px;text-align:center}
            .header h1{color:#e2c27d;margin:0;font-size:22px;letter-spacing:2px;text-transform:uppercase}
            .body{padding:40px;text-align:center}
            .otp-box{background:#f8f8f8;border:2px dashed #e2c27d;border-radius:8px;padding:20px 32px;display:inline-block;margin:24px 0}
            .otp{font-size:42px;font-weight:700;letter-spacing:12px;color:#1a1a2e;font-family:monospace}
            .expiry{color:#888;font-size:13px;margin-top:8px}
            p{color:#444;line-height:1.6}
            .footer{background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #eee}
            .footer p{color:#aaa;font-size:12px;margin:0}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>${process.env.APP_NAME || 'CrowdFund'}</h1></div>
            <div class="body">
              <p>Hi <strong>${userName}</strong>,</p>
              <p>Use the code below to verify your email. It expires in <strong>5 minutes</strong>.</p>
              <div class="otp-box">
                <div class="otp">${otp}</div>
                <div class="expiry">Expires in 5 minutes</div>
              </div>
              <p style="color:#999;font-size:13px">Never share this code with anyone.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'CrowdFund'}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}
