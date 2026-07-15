import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const plans = [
  { 
    name: 'Pro', 
    price: '₹299', 
    period: '/month', 
    desc: 'For serious job seekers', 
    features: ['Unlimited interviews', 'Full AI report & scoring', 'All 3 domains', 'Resume intelligence', 'Priority support'], 
    cta: 'Upgrade Now →', 
    highlight: false 
  },
  { 
    name: 'Premium', 
    price: '₹599', 
    period: '/month', 
    desc: 'For placement-ready students', 
    features: ['Everything in Pro', 'Custom role targeting', 'Interview recordings', 'Performance analytics', 'Success manager'], 
    cta: 'Go Premium', 
    highlight: true // Most Popular highlight shifted here
  },
  { 
    name: 'Custom Plan', 
    price: "Let's talk", 
    period: '', 
    desc: 'For colleges & organisations', 
    features: ['Everything in Premium', 'Bulk interview slots', 'Dedicated account manager', 'Custom branding', 'Priority onboarding'], 
    cta: 'Contact Us →', 
    highlight: false,
    isCustom: true // Triggers the split-screen modal
  },
]

export default function Pricing() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <section id="pricing" className="bg-bg-light py-24 px-6 relative font-sans">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <p className="text-[#5358F3] text-sm font-semibold tracking-wide uppercase mb-3">Pricing</p>
          <h2 className="font-bold text-4xl md:text-5xl text-gray-900 mb-4">
            Simple, <span className="text-[#5358F3]">Transparent</span> Pricing
          </h2>
          <p className="text-gray-500 text-lg">Start free. No credit card required.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: plan.highlight ? -4 : -6 }}
              className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-[#5358F3] to-[#883BE8] text-white shadow-2xl shadow-[#5358F3]/30 scale-105 md:z-10'
                  : 'bg-white border border-gray-100 text-gray-900 shadow-sm hover:shadow-xl'
              }`}>
              
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-white text-[#5358F3] text-xs font-bold px-4 py-1 rounded-full shadow border border-gray-50">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <p className={`text-sm font-semibold tracking-wide uppercase mb-2 ${plan.highlight ? 'text-white/80' : 'text-[#5358F3]'}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 my-3">
                  <span className="font-bold text-4xl tracking-tight">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-white/70' : 'text-gray-400'}`}>{plan.desc}</p>
                
                <div className={`w-full h-px mb-6 ${plan.highlight ? 'bg-white/20' : 'bg-gray-100'}`} />

                <ul className="flex flex-col gap-3.5 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="mt-0.5 flex-shrink-0">
                        <path d="M5 13l4 4L19 7" stroke={plan.highlight ? 'white' : '#5358F3'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className={plan.highlight ? 'text-white/90' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                {plan.isCustom ? (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="block w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all duration-200 bg-gradient-to-r from-[#5358F3] to-[#883BE8] text-white hover:opacity-95 shadow-md"
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <Link to="/signup"
                    className={`block w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all duration-200 ${
                      plan.highlight
                        ? 'bg-white text-[#5358F3] hover:bg-gray-50 shadow-sm'
                        : 'bg-gradient-to-r from-[#5358F3] to-[#883BE8] text-white hover:opacity-95'
                    }`}>
                    {plan.cta}
                  </Link>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Split-Screen Contact Modal */}
      <CustomPlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  )
}

function CustomPlanModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ isTnp: '', needsBulk: '', orgName: '', description: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.orgName || !form.description || !form.isTnp || !form.needsBulk) return
    

    try {
      const response = await fetch('http://localhost:5000/api/auth/custom-plan', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isTnp: form.isTnp,
          needsBulk: form.needsBulk,
          orgName: form.orgName,
          description: form.description
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
      } else {
        alert(data.message || 'Something went wrong saving request.')
      }
    } catch (err) {
      console.error('Error submitting form:', err)
      alert('Network error connecting to backend server.')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4"
        >
          {/* Main Modal Shell */}
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="flex flex-col md:flex-row w-full h-full md:h-auto md:max-w-5xl md:max-h-[90vh] bg-white md:rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* LEFT SIDE: Purple Brand Panel */}
            <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#5358F3] to-[#883BE8] text-white">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-white/60 block mb-3">Custom Plan</span>
                <h3 className="text-3xl font-extrabold leading-tight mb-4">
                  Let's build something<br /><span className="italic font-bold text-white/90">just for you.</span>
                </h3>
                <p className="text-white/70 text-sm leading-relaxed mb-8">
                  Whether you're managing a university placement cell or scaling corporate hiring workflows, we'll design a deployment framework built around your specific metrics.
                </p>

                {/* 2x2 Stat Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {[
                    { val: '500+', label: 'Colleges Onboarded' },
                    { val: '98%', label: 'Satisfaction Rate' },
                    { val: '10K+', label: 'Candidates Screened' },
                    { val: 'Custom', label: 'Tailored Frameworks' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/10 p-4 rounded-xl text-center">
                      <p className="text-xl font-bold">{stat.val}</p>
                      <p className="text-xs text-white/70 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Banner Strip */}
              <div className="bg-white/10 px-4 py-3 rounded-xl flex items-center gap-3 border border-white/5">
                <span className="text-base flex-shrink-0"></span>
                <p className="text-xs text-white/80 font-medium">
                  Custom Pricing structures configured for organizations of all operational scale profiles.
                </p>
              </div>
            </div>

            {/* RIGHT SIDE: Interactive Configuration Space */}
            <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-6 md:px-12 py-12 overflow-y-auto relative">
              {/* Close Icon Trigger */}
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full outline-none"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {!submitted ? (
                <form onSubmit={handleSubmit} className="flex flex-col h-full justify-center">
                  <div className="mb-6">
                    <h4 className="text-2xl font-bold text-gray-900 mb-1">Tell us about your needs</h4>
                    <p className="text-gray-500 text-sm">We'll configure a quote profile for you within 24 hours.</p>
                  </div>

                  <div className="space-y-5">
                    {/* Yes/No Question 1 */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">
                        Are you from a college / university placement cell (TNP)?
                      </label>
                      <div className="flex gap-3">
                        {['Yes', 'No'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setForm({ ...form, isTnp: opt })}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 outline-none ${
                              form.isTnp === opt 
                                ? 'border-[#5358F3] bg-[#5358F3] text-white shadow-sm' 
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Yes/No Question 2 */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">
                        Do you need bulk interview slots (50+ candidates)?
                      </label>
                      <div className="flex gap-3">
                        {['Yes', 'No'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setForm({ ...form, needsBulk: opt })}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 outline-none ${
                              form.needsBulk === opt 
                                ? 'border-[#5358F3] bg-[#5358F3] text-white shadow-sm' 
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Input Field */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        Name of College or Organisation
                      </label>
                      <input
                        type="text"
                        required
                        value={form.orgName}
                        onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                        placeholder="e.g. IIT Delhi, TechCorp"
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#5358F3] transition-colors outline-none text-gray-800 placeholder-gray-400 text-sm"
                      />
                    </div>

                    {/* Textarea Field */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        Describe your requirements
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Tell us about expected pipeline volume, specific features, timeline objectives..."
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#5358F3] transition-colors outline-none text-gray-800 placeholder-gray-400 text-sm resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#5358F3] to-[#883BE8] hover:opacity-95 transition-all shadow-md mt-2 outline-none"
                    >
                      Submit Request →
                    </button>
                  </div>
                </form>
              ) : (
                /* Success View State Frame */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center max-w-xs mx-auto py-6"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5358F3] to-[#883BE8] flex items-center justify-center text-white mb-5 shadow-lg shadow-[#5358F3]/20">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h4 className="text-2xl font-extrabold text-gray-900 mb-2">Request Confirmed!</h4>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    Our platform alignment strategies team will analyze your metrics and respond directly with an operating blueprint within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false)
                      setForm({ isTnp: '', needsBulk: '', orgName: '', description: '' })
                      onClose()
                    }}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors outline-none"
                  >
                    Return to Pricing
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}