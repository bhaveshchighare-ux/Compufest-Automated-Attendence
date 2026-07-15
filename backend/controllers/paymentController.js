const Razorpay = require('razorpay')
const crypto = require('crypto')
const User = require('../models/User')

// Initialize Razorpay
const isRazorpayConfigured = process.env.RAZORPAY_KEY_ID && 
                             process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id' &&
                             process.env.RAZORPAY_KEY_SECRET

const razorpay = isRazorpayConfigured 
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null

const createSubscription = async (req, res) => {
  try {
    const { planName } = req.body
    if (!['pro', 'premium'].includes(planName)) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' })
    }

    const planId = planName === 'pro' 
      ? process.env.RAZORPAY_PRO_PLAN_ID 
      : process.env.RAZORPAY_PREMIUM_PLAN_ID

    // Mock Mode Fallback if Razorpay is not configured
    if (!isRazorpayConfigured || !planId) {
      console.log('⚠️ Razorpay credentials or Plan IDs not configured. Falling back to Mock Mode.')
      return res.json({
        success: true,
        isMock: true,
        subscriptionId: `sub_mock_${Date.now()}`,
        key: 'mock_key',
        planName,
      })
    }

    let customerId = req.user.razorpayCustomerId
    if (!customerId) {
      // Create customer in Razorpay
      const customer = await razorpay.customers.create({
        name: `${req.user.firstName} ${req.user.lastName}`.trim(),
        email: req.user.email,
        contact: req.user.phone || undefined,
      })
      customerId = customer.id
      
      await User.updateOne(
        { _id: req.user._id },
        { $set: { razorpayCustomerId: customerId } }
      )
      req.user.razorpayCustomerId = customerId
    }

    // Create subscription on Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 1, // 1 month one-time pass
      quantity: 1,
    })

    res.json({
      success: true,
      isMock: false,
      subscriptionId: subscription.id,
      key: process.env.RAZORPAY_KEY_ID,
      planName,
    })
  } catch (error) {
    console.error('Create Razorpay subscription error:', error)
    res.status(500).json({ success: false, message: error.message || 'Subscription creation failed' })
  }
}

const verifySubscription = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planName } = req.body

    if (!razorpay_subscription_id) {
      return res.status(400).json({ success: false, message: 'Subscription ID is required' })
    }

    // If it's a mock subscription, verify immediately
    if (razorpay_subscription_id.startsWith('sub_mock_')) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            plan: planName,
            subscriptionId: razorpay_subscription_id,
            planStatus: 'active',
            billingCycleStart: new Date(),
            monthlyInterviewsCount: 0,
            interviewCredits: planName === 'pro' 
              ? parseInt(process.env.PRO_PLAN_CREDITS) || 15 
              : parseInt(process.env.PREMIUM_PLAN_CREDITS) || 30, // High credits for legacy checks
          }
        },
        { new: true }
      )
      return res.json({
        success: true,
        message: 'Mock payment verified successfully',
        user: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          plan: updatedUser.plan,
          planStatus: updatedUser.planStatus,
          monthlyInterviewsCount: updatedUser.monthlyInterviewsCount,
          billingCycleStart: updatedUser.billingCycleStart,
          interviewCredits: updatedUser.interviewCredits,
        }
      })
    }

    if (!razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment details are incomplete' })
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' })
    }

    // Upgrade user plan
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          plan: planName,
          subscriptionId: razorpay_subscription_id,
          planStatus: 'active',
          billingCycleStart: new Date(),
          monthlyInterviewsCount: 0,
          interviewCredits: planName === 'pro' 
            ? parseInt(process.env.PRO_PLAN_CREDITS) || 15 
            : parseInt(process.env.PREMIUM_PLAN_CREDITS) || 30,
        }
      },
      { new: true }
    )

    res.json({
      success: true,
      message: 'Subscription payment verified successfully',
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        plan: updatedUser.plan,
        planStatus: updatedUser.planStatus,
        monthlyInterviewsCount: updatedUser.monthlyInterviewsCount,
        billingCycleStart: updatedUser.billingCycleStart,
        interviewCredits: updatedUser.interviewCredits,
      }
    })
  } catch (error) {
    console.error('Verify subscription signature error:', error)
    res.status(500).json({ success: false, message: error.message || 'Signature verification failed' })
  }
}

const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user || !user.subscriptionId) {
      return res.status(400).json({ success: false, message: 'No active subscription found' })
    }

    // Check if subscription is mock
    if (user.subscriptionId.startsWith('sub_mock_')) {
      user.planStatus = 'canceled'
      await user.save()
      return res.json({
        success: true,
        message: 'Mock subscription cancelled successfully. You will remain on your plan until the end of the billing cycle.',
        user: {
          plan: user.plan,
          planStatus: user.planStatus,
        }
      })
    }

    if (!isRazorpayConfigured) {
      return res.status(500).json({ success: false, message: 'Razorpay is not configured' })
    }

    // Cancel on Razorpay at the end of the current billing cycle
    await razorpay.subscriptions.cancel(user.subscriptionId, {
      cancel_at_end: 1, // 1 to cancel at the end of the current cycle, 0 to cancel immediately
    })

    user.planStatus = 'canceled'
    await user.save()

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. Access remains active until the end of the current billing period.',
      user: {
        plan: user.plan,
        planStatus: user.planStatus,
      }
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    res.status(500).json({ success: false, message: error.message || 'Cancellation failed' })
  }
}

module.exports = {
  createSubscription,
  verifySubscription,
  cancelSubscription,
}
