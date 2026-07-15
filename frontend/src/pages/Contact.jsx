import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getUser, isLoggedIn } from '../lib/auth'
import { contactAPI } from '../lib/api'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' },
})

export default function Contact() {
  const navigate = useNavigate()
  const user = getUser()
  const loggedIn = isLoggedIn()

  const [form, setForm] = useState({
    name: '',
    collegeName: '',
    email: '',
    description: '',
    forWhom: 'TNP', // default
    creditsRequested: 100, // default requested credits for bulk/TNP
    optionQuestions: {
      isOfficialPlacement: true,
      needCustomRoles: false,
      needAtsIntegration: false,
      requestWalkthrough: true,
    }
  })

  const [focused, setFocused] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  // Prefill user details if logged in
  useEffect(() => {
    if (loggedIn) {
      const currentUser = getUser()
      if (currentUser) {
        setForm(prev => ({
          ...prev,
          name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
          email: currentUser.email || '',
        }))
      }
    }
  }, [loggedIn])

  const validateForm = () => {
    const errs = {}
    const gmailRegex = /^[\w-\.]+@gmail\.com$/

    if (!form.name.trim()) errs.name = 'Name of the person requesting is required'
    
    if (!form.email.trim()) {
      errs.email = 'Gmail address is required'
    } else if (!gmailRegex.test(form.email.trim().toLowerCase())) {
      errs.email = 'Please provide a valid Gmail address ending in @gmail.com'
    }

    if (!form.description.trim()) errs.description = 'Description is required'

    if (!form.creditsRequested || isNaN(form.creditsRequested) || Number(form.creditsRequested) <= 0) {
      errs.creditsRequested = 'Requested credits count must be a number greater than 0'
    }

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleOptionToggle = (key) => {
    setForm(prev => ({
      ...prev,
      optionQuestions: {
        ...prev.optionQuestions,
        [key]: !prev.optionQuestions[key]
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await contactAPI.submitContactForm({
        name: form.name.trim(),
        collegeName: form.collegeName.trim(),
        email: form.email.trim().toLowerCase(),
        description: form.description.trim(),
        forWhom: form.forWhom,
        creditsRequested: Number(form.creditsRequested),
        optionQuestions: form.optionQuestions,
      })

      if (response.success) {
        setSuccess(response.message || 'Inquiry submitted successfully!')
        // Reset form except name/email if user is logged in
        setForm(prev => ({
          ...prev,
          collegeName: '',
          description: '',
          creditsRequested: 100,
          optionQuestions: {
            isOfficialPlacement: true,
            needCustomRoles: false,
            needAtsIntegration: false,
            requestWalkthrough: true,
          }
        }))
      }
    } catch (err) {
      setError(err.message || 'Failed to submit inquiry. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] py-16 px-6 font-body">
      <div className="max-w-4xl mx-auto">
        
        {/* Back navigation */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate(loggedIn ? '/dashboard' : '/')}
            className="flex items-center gap-1.5 text-text-mid hover:text-primary text-sm font-semibold transition-colors bg-transparent border-none cursor-pointer"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loggedIn ? 'Dashboard' : 'Home'}
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#5358F3] to-[#9F3BDF] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M6 9l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-heading font-bold text-lg text-text-dark">
              MockPrep<span className="text-primary">.ai</span>
            </span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-text-dark mb-3">
            Institutional & Bulk Plan <span className="text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Inquiries</span>
          </h1>
          <p className="font-body text-text-mid text-base max-w-xl mx-auto">
            Partner with us to offer custom credits, interview assessments, and placement tools for your college or cohort.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-border-light rounded-3xl shadow-xl overflow-hidden p-8 md:p-10">
          
          {/* Notifications */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-start gap-2.5 shadow-sm"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="mt-0.5 flex-shrink-0">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <p className="font-semibold">Submission failed</p>
                <p className="text-xs opacity-90 mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-600 flex items-start gap-2.5 shadow-sm"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="mt-0.5 flex-shrink-0">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <p className="font-semibold">Success!</p>
                <p className="text-xs opacity-90 mt-0.5">{success}</p>
              </div>
            </motion.div>
          )}

          {/* Credits System Integration info */}
          {loggedIn && user && (
            <motion.div
              {...fadeUp(0.05)}
              className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading font-bold text-text-dark text-sm">Account Balance Integration</p>
                  <p className="font-body text-text-mid text-xs">Logged in as {user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right sm:text-right">
                  <span className="text-text-light text-[10px] block uppercase font-semibold">Active Plan</span>
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
                    {user.plan || 'Free'}
                  </span>
                </div>
                <div className="text-right border-l border-blue-200/60 pl-4">
                  <span className="text-text-light text-[10px] block uppercase font-semibold">Current Credits</span>
                  <span className="text-text-dark font-bold text-sm">
                    {user.interviewCredits > 1000 ? '∞' : user.interviewCredits}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Requester Name & College Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <motion.div {...fadeUp(0.1)}>
                <label className="block text-sm font-semibold text-text-mid mb-1.5">
                  Name of the Requestor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. John Doe"
                  value={form.name}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused('')}
                  onChange={e => handleChange('name', e.target.value)}
                  style={{ borderColor: focused === 'name' ? '#5358F3' : '#e8e8f0' }}
                  className={`w-full border outline-none text-text-dark font-body text-sm px-4 py-3 rounded-xl transition-all bg-white placeholder:text-text-light focus:ring-2 focus:ring-primary/10 ${
                    validationErrors.name ? 'border-red-300 ring-2 ring-red-500/10' : 'border-border-light'
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                )}
              </motion.div>

              <motion.div {...fadeUp(0.15)}>
                <label className="block text-sm font-semibold text-text-mid mb-1.5">
                  College / University Name <span className="text-text-light text-xs font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={form.collegeName}
                  onFocus={() => setFocused('collegeName')}
                  onBlur={() => setFocused('')}
                  onChange={e => handleChange('collegeName', e.target.value)}
                  style={{ borderColor: focused === 'collegeName' ? '#5358F3' : '#e8e8f0' }}
                  className="w-full border border-border-light outline-none text-text-dark font-body text-sm px-4 py-3 rounded-xl transition-all bg-white placeholder:text-text-light focus:ring-2 focus:ring-primary/10"
                />
              </motion.div>
            </div>

            {/* Email Field */}
            <motion.div {...fadeUp(0.2)}>
              <label className="block text-sm font-semibold text-text-mid mb-1.5">
                Gmail Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="your.email@gmail.com"
                value={form.email}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                onChange={e => handleChange('email', e.target.value)}
                style={{ borderColor: focused === 'email' ? '#5358F3' : '#e8e8f0' }}
                className={`w-full border outline-none text-text-dark font-body text-sm px-4 py-3 rounded-xl transition-all bg-white placeholder:text-text-light focus:ring-2 focus:ring-primary/10 ${
                  validationErrors.email ? 'border-red-300 ring-2 ring-red-500/10' : 'border-border-light'
                }`}
              />
              {validationErrors.email && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
              )}
            </motion.div>

            {/* Request Category & Credits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <motion.div {...fadeUp(0.25)}>
                <label className="block text-sm font-semibold text-text-mid mb-1.5">
                  For Whom <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  {['TNP', 'Bulk Plan'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange('forWhom', type)}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer ${
                        form.forWhom === type
                          ? 'bg-gradient-to-r from-[#5358F3] to-[#883BE8] text-white border-transparent shadow-md shadow-primary/10'
                          : 'bg-white text-text-mid border-border-light hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Credits Section */}
              <motion.div {...fadeUp(0.3)}>
                <label className="block text-sm font-semibold text-text-mid mb-1.5">
                  Requested Seat/Interview Credits <span className="text-red-500">*</span>
                </label>
                {/* 
                  Note: Credit limits for Pro/Premium are now configurable via PRO_PLAN_CREDITS and PREMIUM_PLAN_CREDITS env variables
                  in backend/controllers/paymentController.js and webhookRoutes.js.
                */}
                <select
                  value={form.creditsRequested}
                  onChange={e => handleChange('creditsRequested', Number(e.target.value))}
                  className="w-full border border-border-light outline-none text-text-dark font-body text-sm px-4 py-3 rounded-xl transition-all bg-white focus:ring-2 focus:ring-primary/10 cursor-pointer"
                >
                  <option value={50}>50 Credits</option>
                  <option value={100}>100 Credits</option>
                  <option value={250}>250 Credits</option>
                  <option value={500}>500 Credits</option>
                  <option value={1000}>1000+ Credits (Custom Institutional)</option>
                </select>
                {validationErrors.creditsRequested && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.creditsRequested}</p>
                )}
              </motion.div>
            </div>

            {/* Yes/No Option-based Questions */}
            <motion.div {...fadeUp(0.35)} className="bg-gray-50 rounded-2xl p-6 border border-border-light/80">
              <h3 className="font-heading font-bold text-text-dark text-sm mb-4 flex items-center gap-1.5">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-primary">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Additional Options & Requirements
              </h3>

              <div className="flex flex-col gap-4">
                {[
                  {
                    key: 'isOfficialPlacement',
                    label: 'Are you an official representative of the placement department?',
                  },
                  {
                    key: 'needCustomRoles',
                    label: 'Do you need custom target roles outside Standard Software Development?',
                  },
                  {
                    key: 'needAtsIntegration',
                    label: 'Do you require integration with your college ATS / portal?',
                  },
                  {
                    key: 'requestWalkthrough',
                    label: 'Would you like to schedule a 15-minute live platform walkthrough?',
                  }
                ].map(opt => (
                  <div key={opt.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1.5 border-b border-border-light/50 last:border-b-0">
                    <span className="text-text-mid text-xs font-medium max-w-md">{opt.label}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!form.optionQuestions[opt.key]) handleOptionToggle(opt.key)
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          form.optionQuestions[opt.key]
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-white text-text-light border border-border-light hover:bg-gray-50'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (form.optionQuestions[opt.key]) handleOptionToggle(opt.key)
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !form.optionQuestions[opt.key]
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-white text-text-light border border-border-light hover:bg-gray-50'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Description / Requirements Details */}
            <motion.div {...fadeUp(0.4)}>
              <label className="block text-sm font-semibold text-text-mid mb-1.5">
                Description / Requirement Details <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Please provide details of your requirement/request. You can also include alternative contact details (phone, LinkedIn etc.) here if needed."
                value={form.description}
                onFocus={() => setFocused('description')}
                onBlur={() => setFocused('')}
                onChange={e => handleChange('description', e.target.value)}
                style={{ borderColor: focused === 'description' ? '#5358F3' : '#e8e8f0' }}
                className={`w-full border outline-none text-text-dark font-body text-sm px-4 py-3 rounded-xl transition-all bg-white placeholder:text-text-light focus:ring-2 focus:ring-primary/10 ${
                  validationErrors.description ? 'border-red-300 ring-2 ring-red-500/10' : 'border-border-light'
                }`}
              />
              {validationErrors.description && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.description}</p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.button
              {...fadeUp(0.45)}
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.01, boxShadow: '0 8px 25px rgba(83,88,243,0.25)' } : {}}
              whileTap={!loading ? { scale: 0.99 } : {}}
              className="w-full bg-gradient-to-r from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-3.5 rounded-xl transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Submitting Request...
                </>
              ) : (
                <>
                  Submit Request
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="ml-1">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </motion.button>

          </form>
        </div>

      </div>
    </div>
  )
}
