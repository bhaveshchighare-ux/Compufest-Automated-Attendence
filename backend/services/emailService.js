const nodemailer = require('nodemailer')
const { Client } = require('@upstash/qstash')

const hasSmtpConfig = () => Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
)

const createTransporter = () => {
  if (!hasSmtpConfig()) return null

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const sendSignupOtpEmail = async ({ to, otp, firstName }) => {
  const transporter = createTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'MockPrep.ai <no-reply@mockprep.ai>'

  if (!transporter && !process.env.QSTASH_TOKEN) {
    console.log(`[email:dev] Signup OTP for ${to}: ${otp}`)
    return { skipped: true }
  }

  if (process.env.QSTASH_TOKEN) {
    const qstashClient = new Client({ 
      token: process.env.QSTASH_TOKEN,
      baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io"
    })
    const backendUrl = process.env.BACKEND_URL || "https://your-vercel-domain.vercel.app"
    await qstashClient.publishJSON({
      url: `${backendUrl}/api/webhooks/qstash-email`,
      body: { type: 'signup_otp', to, otp, firstName },
      headers: {
        Authorization: `Bearer ${process.env.QSTASH_WEBHOOK_SECRET || "default_secret"}`
      }
    })
    return { skipped: false }
  }

  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your MockPrep.ai email',
    text: `Hi ${firstName}, your MockPrep.ai verification code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Verify your MockPrep.ai email</h2>
        <p>Hi ${firstName},</p>
        <p>Use this 6-digit code to finish creating your account:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 20px 0;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  })

  return { skipped: false }
}

const sendPasswordResetOtpEmail = async ({ to, otp, firstName }) => {
  const transporter = createTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'MockPrep.ai <no-reply@mockprep.ai>'

  if (!transporter && !process.env.QSTASH_TOKEN) {
    console.log(`[email:dev] Password reset OTP for ${to}: ${otp}`)
    return { skipped: true }
  }

  if (process.env.QSTASH_TOKEN) {
    const qstashClient = new Client({ 
      token: process.env.QSTASH_TOKEN,
      baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io"
    })
    const backendUrl = process.env.BACKEND_URL || "https://your-vercel-domain.vercel.app"
    await qstashClient.publishJSON({
      url: `${backendUrl}/api/webhooks/qstash-email`,
      body: { type: 'password_reset_otp', to, otp, firstName },
      headers: {
        Authorization: `Bearer ${process.env.QSTASH_WEBHOOK_SECRET || "default_secret"}`
      }
    })
    return { skipped: false }
  }

  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your MockPrep.ai password',
    text: `Hi ${firstName || 'there'}, your MockPrep.ai password reset code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Reset your MockPrep.ai password</h2>
        <p>Hi ${firstName || 'there'},</p>
        <p>Use this 6-digit code to reset your password:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 20px 0;">${otp}</p>
        <p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  })

  return { skipped: false }
}

const sendRawEmail = async (mailOptions) => {
  const transporter = createTransporter()
  if (!transporter) {
    console.log(`[email:dev] Send raw email to ${mailOptions.to}`)
    return { skipped: true }
  }
  return await transporter.sendMail(mailOptions)
}

module.exports = { sendSignupOtpEmail, sendPasswordResetOtpEmail, sendRawEmail, createTransporter }
