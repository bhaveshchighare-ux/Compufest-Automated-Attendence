const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const User = require('../models/User')
const { sendRawEmail } = require('../services/emailService')

router.post('/qstash-email', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const expectedSecret = `Bearer ${process.env.QSTASH_WEBHOOK_SECRET || "default_secret"}`
    
    if (!authHeader || authHeader !== expectedSecret) {
      return res.status(401).json({ success: false, message: "Unauthorized QStash Webhook" })
    }

    const { type, to, otp, firstName } = req.body
    if (!to) {
      return res.status(400).json({ success: false, message: "Missing required email recipient" })
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'MockPrep.ai <no-reply@mockprep.ai>'
    let subject, text, html

    if (type === 'signup_otp') {
      subject = 'Verify your MockPrep.ai email'
      text = `Hi ${firstName}, your MockPrep.ai verification code is ${otp}. It expires in 10 minutes.`
      html = `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">Verify your MockPrep.ai email</h2>
          <p>Hi ${firstName},</p>
          <p>Use this 6-digit code to finish creating your account:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 20px 0;">${otp}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `
    } else if (type === 'password_reset_otp') {
      subject = 'Reset your MockPrep.ai password'
      text = `Hi ${firstName || 'there'}, your MockPrep.ai password reset code is ${otp}. It expires in 10 minutes.`
      html = `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">Reset your MockPrep.ai password</h2>
          <p>Hi ${firstName || 'there'},</p>
          <p>Use this 6-digit code to reset your password:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 20px 0;">${otp}</p>
          <p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
        </div>
      `
    } else {
      return res.status(400).json({ success: false, message: "Unknown email type" })
    }

    await sendRawEmail({ from, to, subject, text, html })
    console.log(`✅ QStash background email sent to ${to}`)

    return res.json({ success: true, message: "Email sent via QStash webhook" })
  } catch (error) {
    console.error("❌ QStash webhook error:", error.message)
    return res.status(500).json({ success: false, message: "Failed to process QStash webhook" })
  }
})

// Razorpay Webhook Endpoint
router.post('/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature']
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      console.log('⚠️ Razorpay webhook signature or secret missing.')
      return res.status(400).json({ success: false, message: 'Missing signature or webhook secret' })
    }

    // Verify webhook signature
    const shasum = crypto.createHmac('sha256', webhookSecret)
    const payload = req.rawBody || JSON.stringify(req.body)
    shasum.update(payload)
    const digest = shasum.digest('hex')

    if (digest !== signature) {
      console.log('❌ Razorpay webhook signature verification failed.')
      return res.status(400).json({ success: false, message: 'Invalid signature' })
    }

    const { event, payload: eventPayload } = req.body
    console.log(`📥 Razorpay Webhook event received: ${event}`)

    if (!eventPayload || !eventPayload.subscription) {
      return res.json({ success: true, message: 'Unhandled event payload' })
    }

    const subscription = eventPayload.subscription.entity
    const subscriptionId = subscription.id
    const customerId = subscription.customer_id

    // Find user by subscription ID or customer ID
    let user = await User.findOne({ subscriptionId })
    if (!user && customerId) {
      user = await User.findOne({ razorpayCustomerId: customerId })
    }

    if (!user) {
      console.log(`⚠️ User not found for subscription ${subscriptionId} / customer ${customerId}`)
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (event === 'subscription.charged') {
      // Determine plan based on plan_id
      let planName = 'pro'
      if (subscription.plan_id === process.env.RAZORPAY_PREMIUM_PLAN_ID) {
        planName = 'premium'
      }

      // Upgrade user or renew billing cycle
      user.plan = planName
      user.subscriptionId = subscriptionId
      user.planStatus = 'active'
      user.billingCycleStart = subscription.current_start 
        ? new Date(subscription.current_start * 1000) 
        : new Date()
      user.monthlyInterviewsCount = 0
      user.interviewCredits = planName === 'pro' 
        ? parseInt(process.env.PRO_PLAN_CREDITS) || 15 
        : parseInt(process.env.PREMIUM_PLAN_CREDITS) || 30 // Unlimited proxy

      await user.save()
      console.log(`✅ Subscription ${subscriptionId} charged. User ${user.email} set to ${planName} plan.`)
    } 
    else if (event === 'subscription.cancelled' || event === 'subscription.completed') {
      const endAt = subscription.end_at ? new Date(subscription.end_at * 1000) : null
      const now = new Date()

      // If scheduled to cancel at end, keep access until end_at
      if (endAt && endAt > now) {
        user.planStatus = 'canceled'
        await user.save()
        console.log(`ℹ️ Subscription ${subscriptionId} cancelled. User ${user.email} retains access until ${endAt}.`)
      } else {
        // Immediate cancellation / end of billing period reached
        user.plan = 'free'
        user.planStatus = null
        user.subscriptionId = null
        user.interviewCredits = parseInt(process.env.FREE_PLAN_CREDITS) || 2
        user.monthlyInterviewsCount = 0
        await user.save()
        console.log(`⬇️ Subscription ${subscriptionId} ended. User ${user.email} downgraded to free.`)
      }
    } 
    else if (event === 'subscription.halted' || event === 'subscription.pending') {
      // If payment failed/halted, suspend access
      user.plan = 'free'
      user.planStatus = 'past_due'
      user.interviewCredits = parseInt(process.env.FREE_PLAN_CREDITS) || 2
      user.monthlyInterviewsCount = 0
      await user.save()
      console.log(`⚠️ Subscription ${subscriptionId} halted/pending. User ${user.email} downgraded to free.`)
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('❌ Razorpay webhook error:', error.message)
    return res.status(500).json({ success: false, message: 'Webhook processing failed' })
  }
})

module.exports = router

