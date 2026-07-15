import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { authAPI } from '../lib/api'

const steps = [
  { id: 1, label: 'Email' },
  { id: 2, label: 'OTP' },
  { id: 3, label: 'Password' },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' },
})

const MailIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M4 7l8 5 8-5M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ShieldIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M12 3l7 3v5c0 4.5-2.8 8.5-7 10-4.2-1.5-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const LockIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path d="M7 10V8a5 5 0 0110 0v2M6 10h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const EyeIcon = ({ hidden }) => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    {hidden ? (
      <>
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6M8.1 5.5A10.8 10.8 0 0112 5c5 0 8.5 4 10 7a17.2 17.2 0 01-3.1 4.1M6.4 6.8A16.7 16.7 0 002 12c1.5 3 5 7 10 7 1.3 0 2.5-.3 3.6-.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    ) : (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    )}
  </svg>
)

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  const normalizedEmail = email.trim().toLowerCase()

  const requestOtp = async () => {
    if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const data = await authAPI.forgotPassword({ email: normalizedEmail })
      setEmail(data.email || normalizedEmail)
      setOtp(['', '', '', '', '', ''])
      setStep(2)
      setSuccess('A reset code has been sent to your email')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (idx, value) => {
    const cleanValue = value.replace(/\D/g, '')
    
    if (cleanValue.length > 1) {
      // Handle paste or autofill
      const pastedData = cleanValue.slice(0, 6).split('')
      const nextOtp = [...otp]
      pastedData.forEach((char, i) => {
        if (idx + i < 6) nextOtp[idx + i] = char
      })
      setOtp(nextOtp)
      
      const lastFilledIndex = Math.min(idx + pastedData.length, 5)
      document.getElementById(`reset-otp-${lastFilledIndex}`)?.focus()
      return
    }

    const next = [...otp]
    next[idx] = cleanValue.slice(-1)
    setOtp(next)

    if (cleanValue && idx < 5) {
      document.getElementById(`reset-otp-${idx + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`reset-otp-${idx - 1}`)?.focus()
    }
  }

  const verifyOtp = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Enter the 6-digit verification code')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const data = await authAPI.verifyPasswordOtp({ email: normalizedEmail, otp: code })
      setResetToken(data.resetToken)
      
      setIsVerified(true)
      setTimeout(() => {
        setIsVerified(false)
        setStep(3)
        setSuccess('Email verified. Create a new password')
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await authAPI.resetPassword({ email: normalizedEmail, resetToken, password })
      setSuccess('Password updated. Redirecting to login...')
      setTimeout(() => navigate('/login'), 900)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const activeIcon = step === 1 ? <MailIcon className="w-8 h-8" /> : step === 2 ? <ShieldIcon className="w-8 h-8" /> : <LockIcon className="w-8 h-8" />

  return (
    <div className="min-h-screen bg-white flex">
      <div className="hidden lg:flex w-[42%] bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white px-12 py-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex flex-col justify-between w-full">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/25 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M6 9l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-heading font-bold">MockPrep.ai</span>
          </Link>

          <div>
            <motion.div {...fadeUp(0.1)} className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-7">
              {activeIcon}
            </motion.div>
            <motion.h1 {...fadeUp(0.16)} className="font-heading font-bold text-4xl leading-tight mb-4">
              Reset access without losing momentum
            </motion.h1>
            <motion.p {...fadeUp(0.22)} className="font-body text-white/80 leading-relaxed">
              Verify your email, confirm the code, and create a fresh password for your MockPrep practice dashboard.
            </motion.p>
          </div>

          <div className="space-y-3">
            {steps.map(item => (
              <div key={item.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${step >= item.id ? 'bg-white/15 border-white/25' : 'bg-white/5 border-white/10'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading font-bold ${step >= item.id ? 'bg-white text-primary' : 'bg-white/10 text-white/70'}`}>
                  {item.id}
                </div>
                <span className="font-body text-sm font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <motion.section
          key={step}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md">
          <Link replace to="/login" className="inline-flex items-center gap-2 text-sm font-body text-primary font-semibold mb-8">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5m0 0l6 6m-6-6l6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to login
          </Link>

          <div className="flex gap-2 mb-7">
            {steps.map(item => (
              <div key={item.id} className={`h-2 flex-1 rounded-full ${step >= item.id ? 'bg-primary' : 'bg-[#ececf5]'}`} />
            ))}
          </div>

          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            {activeIcon}
          </div>

          {step === 1 && (
            <>
              <h2 className="font-heading font-bold text-3xl text-text-dark mb-2">Forgot password?</h2>
              <p className="font-body text-text-mid text-sm leading-relaxed mb-7">
                Enter your registered email and we will send a reset OTP if the account exists.
              </p>
              <label className="block font-body text-sm font-medium text-text-dark mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && requestOtp()}
                placeholder="you@gmail.com"
                className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-2xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </>
          )}

          {step === 2 && (
            <div className="w-full text-center bg-white rounded-3xl p-10 lg:shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
              <style>{`
                @keyframes continuousGlow {
                  0% { border-color: #4f46e5; box-shadow: 0 0 8px #4f46e5; }
                  33% { border-color: #9333ea; box-shadow: 0 0 8px #9333ea; }
                  66% { border-color: #ec4899; box-shadow: 0 0 8px #ec4899; }
                  100% { border-color: #4f46e5; box-shadow: 0 0 8px #4f46e5; }
                }
                .otp-glow { animation: continuousGlow 4s infinite linear; }
              `}</style>
              {isVerified ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.1, 1] }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-[4rem] h-[4rem] rounded-full bg-[#10b981] text-white flex items-center justify-center text-[2rem] font-bold mb-4">
                    ✓
                  </motion.div>
                  <div className="text-[1.25rem] font-semibold text-[#10b981]">OTP Verified</div>
                </motion.div>
              ) : (
                <>
                  <div className="text-[2.5rem] mb-4">🔐</div>

                  <h2 className="font-heading font-semibold text-[1.75rem] text-[#111827] mb-2">Verify Your Identity</h2>
                  <p className="font-body text-[#6b7280] text-[0.95rem] leading-[1.5] mb-6">
                    We've sent a verification code to:<br />
                    <span className="text-[#4f46e5] font-bold">{email}</span>
                  </p>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-center">
                      <p className="font-body text-red-600 text-sm">{error}</p>
                    </motion.div>
                  )}

                  <div className="flex justify-between gap-2 mb-6">
                    {otp.map((value, idx) => (
                      <input
                        key={idx}
                        id={`reset-otp-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={value}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        className={`otp-glow w-12 h-14 rounded-lg bg-white border-2 border-[#e5e7eb] text-center text-2xl font-semibold text-[#111827] outline-none transition-all duration-200 focus:scale-110 focus:z-10`}
                      />
                    ))}
                  </div>

                  <motion.button
                    onClick={verifyOtp}
                    disabled={loading || otp.join('').length < 6}
                    whileHover={!loading ? { scale: 1.02, boxShadow: '0 4px 15px rgba(79,70,229,0.3)' } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    className="w-full bg-gradient-to-r from-[#4f46e5] to-[#9333ea] text-white font-body font-semibold py-[0.75rem] px-[1.5rem] rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </motion.button>

                  <p className="mt-4 text-[0.9rem] text-[#6b7280]">
                    Didn't receive the code?{" "}
                    <button type="button" onClick={requestOtp} disabled={loading} className="text-[#4f46e5] hover:underline transition-colors disabled:opacity-60">
                      {loading ? 'Sending...' : 'Resend'}
                    </button>
                  </p>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <>
              <h2 className="font-heading font-bold text-3xl text-text-dark mb-2">Create new password</h2>
              <p className="font-body text-text-mid text-sm leading-relaxed mb-7">
                Choose a strong password for your MockPrep.ai account.
              </p>

              {[
                { label: 'New password', value: password, setValue: setPassword, visible: showPassword, setVisible: setShowPassword },
                { label: 'Confirm new password', value: confirmPassword, setValue: setConfirmPassword, visible: showConfirm, setVisible: setShowConfirm },
              ].map(item => (
                <div key={item.label} className="mb-4">
                  <label className="block font-body text-sm font-medium text-text-dark mb-1.5">{item.label}</label>
                  <div className="relative">
                    <input
                      type={item.visible ? 'text' : 'password'}
                      value={item.value}
                      onChange={e => item.setValue(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 pr-12 rounded-2xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => item.setVisible(!item.visible)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-mid hover:text-primary transition-colors"
                      aria-label={item.visible ? 'Hide password' : 'Show password'}>
                      <EyeIcon hidden={item.visible} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {step !== 2 && (
            <>
              {error && (
                <div className="mt-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="font-body text-red-600 text-xs">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="font-body text-green-700 text-xs">{success}</p>
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={step === 1 ? requestOtp : updatePassword}
                className="w-full mt-6 bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-3.5 rounded-2xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Working...' : step === 1 ? 'Send OTP' : 'Update Password'}
              </button>
            </>
          )}
        </motion.section>
      </main>
    </div>
  )
}
