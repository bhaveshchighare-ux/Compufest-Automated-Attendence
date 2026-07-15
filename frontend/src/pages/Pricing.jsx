import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, saveUser, getToken } from '../lib/auth'
import { paymentAPI } from '../lib/api'

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Pricing() {
  const navigate = useNavigate()
  const user = getUser()
  
  const [loading, setLoading] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [userPlan, setUserPlan] = useState(user?.plan || 'free')
  const [planStatus, setPlanStatus] = useState(user?.planStatus || null)

  useEffect(() => {
    // Check if script already loaded, if not load it
    if (!window.Razorpay) {
      loadRazorpayScript()
    }
  }, [])

  const plans = [
    {
      name: 'free',
      label: 'Free',
      price: '₹0',
      period: 'forever',
      desc: 'Perfect to try things out',
      features: [
        '3 mock interviews per month',
        'Basic AI feedback',
        'Technical domain only',
        'Email support',
      ],
      cta: 'Current Plan',
      color: 'border-slate-200 bg-white text-slate-800',
    },
    {
      name: 'pro',
      label: 'Pro',
      price: '₹299',
      period: '/month',
      desc: 'For serious job seekers',
      features: [
        'Unlimited mock interviews',
        'Full AI report & scoring details',
        'All 3 domains (Technical, Behavioral, Case Study)',
        'Resume intelligence analysis',
        'Priority support',
      ],
      cta: 'Upgrade to Pro',
      highlight: true,
      color: 'border-primary bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white shadow-xl shadow-primary/20 scale-105',
    },
    {
      name: 'premium',
      label: 'Premium',
      price: '₹599',
      period: '/month',
      desc: 'For ultimate placement preparation',
      features: [
        'Everything in Pro plan',
        'Custom role targeting (unlocked input)',
        'Performance Analytics dashboard',
        'Success manager sessions',
      ],
      cta: 'Go Premium',
      color: 'border-slate-200 bg-white text-slate-800',
    },
  ]

  const handleCancelSubscription = async () => {
    setCanceling(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await paymentAPI.cancel()
      if (res.success) {
        setPlanStatus('canceled')
        // Update user storage
        const currentUser = getUser()
        currentUser.planStatus = 'canceled'
        saveUser(getToken(), currentUser)
        setSuccessMsg(res.message || 'Subscription cancelled successfully.')
      }
    } catch (err) {
      setError(err.message || 'Could not cancel subscription')
    } finally {
      setCanceling(false)
    }
  }

  const handleSubscribe = async (planName) => {
    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      // 1. Load checkout script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Are you connected to the internet?')
      }

      // 2. Create subscription order
      const data = await paymentAPI.createSubscription(planName)

      if (!data.success) {
        throw new Error(data.message || 'Failed to initialize subscription')
      }

      // 3. Check if we received mock billing details
      if (data.isMock) {
        // Direct mock verify
        const verifyRes = await paymentAPI.verify({
          razorpay_subscription_id: data.subscriptionId,
          planName,
        })

        if (verifyRes.success) {
          saveUser(getToken(), verifyRes.user)
          setUserPlan(verifyRes.user.plan)
          setPlanStatus(verifyRes.user.planStatus)
          setSuccessMsg(`Successfully upgraded to ${verifyRes.user.plan.toUpperCase()}! (Mock Integration Mode)`)
          setTimeout(() => navigate('/dashboard'), 2000)
        } else {
          throw new Error('Mock verification failed')
        }
        return
      }

      // 4. Open real Razorpay checkout
      const options = {
        key: data.key,
        subscription_id: data.subscriptionId,
        name: 'MockPrep.ai',
        description: `Subscribe to ${planName.toUpperCase()} plan`,
        image: 'https://cdn-icons-png.flaticon.com/512/1162/1162456.png',
        handler: async (response) => {
          try {
            setLoading(true)
            const verifyRes = await paymentAPI.verify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              planName,
            })

            if (verifyRes.success) {
              saveUser(getToken(), verifyRes.user)
              setUserPlan(verifyRes.user.plan)
              setPlanStatus(verifyRes.user.planStatus)
              setSuccessMsg(`Successfully upgraded to ${verifyRes.user.plan.toUpperCase()}!`)
              setTimeout(() => navigate('/dashboard'), 2000)
            } else {
              setError('Payment verification failed. Please contact support.')
            }
          } catch (err) {
            setError(err.message || 'Error verifying payment')
          } finally {
            setLoading(false)
          }
        },
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
        },
        theme: {
          color: '#5358F3',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Payment processing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] py-16 px-6 font-body">
      <div className="max-w-6xl mx-auto">
        
        {/* Back navigation */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-text-mid hover:text-primary text-sm font-semibold transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </button>
          
          <div className="text-right">
            <span className="text-text-light text-xs mr-2">Current Plan:</span>
            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase">
              {userPlan} {planStatus === 'canceled' && '(Canceled)'}
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-heading font-bold text-4xl md:text-5xl text-text-dark mb-4">
            Pricing Plans built for <span className="text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Every Career Stage</span>
          </h1>
          <p className="font-body text-text-mid text-lg max-w-xl mx-auto">
            Upgrade your plan to unlock more interviews, detailed scorecards, performance analytics, and custom roles.
          </p>
        </div>

        {/* Errors & Success Notifications */}
        {error && (
          <div className="max-w-md mx-auto mb-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 text-center shadow-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="max-w-md mx-auto mb-8 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 text-center shadow-sm font-semibold">
            {successMsg}
          </div>
        )}

        {/* Current Active Plan Portal */}
        {userPlan !== 'free' && (
          <div className="max-w-3xl mx-auto mb-12 bg-white border border-border-light rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div>
              <h2 className="font-heading font-bold text-lg text-text-dark mb-1">Active Plan: {userPlan.toUpperCase()}</h2>
              <p className="font-body text-text-mid text-sm">
                You are currently on a 1-month pass. Your premium access will automatically expire at the end of your billing cycle.
              </p>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isCurrent = userPlan === plan.name
            
            return (
              <div
                key={plan.name}
                className={`relative rounded-3xl border p-8 flex flex-col gap-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${plan.color}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-white text-primary text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase">
                      Best Value
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="font-heading font-bold text-2xl mb-1 uppercase tracking-wide">{plan.label}</h3>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="font-heading font-bold text-4xl">{plan.price}</span>
                    <span className="text-sm opacity-80">{plan.period}</span>
                  </div>
                  <p className="text-sm opacity-90 leading-relaxed min-h-[40px]">{plan.desc}</p>
                </div>

                <hr className={`border-t ${plan.highlight ? 'border-white/20' : 'border-slate-100'}`} />

                <ul className="flex flex-col gap-3.5 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-sm leading-relaxed opacity-95">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div>
                  {plan.name === 'free' ? (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-2xl text-center text-sm font-bold bg-slate-100 text-slate-400 cursor-not-allowed"
                    >
                      {isCurrent ? 'Current Plan' : 'Free Plan'}
                    </button>
                  ) : isCurrent ? (
                    <button
                      disabled
                      className={`w-full py-3.5 rounded-2xl text-center text-sm font-bold ${
                        plan.highlight 
                          ? 'bg-white/10 text-white/80' 
                          : 'bg-slate-100 text-slate-400'
                      } cursor-not-allowed`}
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.name)}
                      disabled={loading}
                      className={`w-full py-3.5 rounded-2xl text-center text-sm font-bold transition-all duration-200 active:scale-95 ${
                        plan.highlight
                          ? 'bg-white text-primary hover:bg-slate-50 hover:shadow-lg'
                          : 'bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white hover:shadow-lg hover:shadow-primary/20'
                      } disabled:opacity-50`}
                    >
                      {loading ? 'Processing...' : plan.cta}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
