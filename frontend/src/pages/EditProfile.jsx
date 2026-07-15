import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  GraduationCap,
  Link as LinkIcon,
  Loader2,
  Mail,
  Phone,
  Save,
  Star,
  Target,
  User,
} from 'lucide-react'
import { getToken, getUser, saveUser } from '../lib/auth'
import { authAPI } from '../lib/api'

const experienceOptions = [
  { value: '', label: 'Select experience level' },
  { value: 'Fresher (0 Years)', label: 'Fresher (0 Years)' },
  { value: '1-2 Years', label: '1-2 Years' },
  { value: '3-5 Years', label: '3-5 Years' },
  { value: '5+ Years', label: '5+ Years' },
]

const validateForm = (data) => {
  const errors = {}
  const phoneClean = data.phone.replace(/\s/g, '')
  const graduationYear = data.graduationYear.toString().trim()

  if (!data.firstName.trim()) errors.firstName = 'First name is required.'
  if (!data.lastName.trim()) errors.lastName = 'Last name is required.'
  if (!phoneClean) errors.phone = 'Phone number is required.'
  else if (!/^\d{10}$/.test(phoneClean)) errors.phone = 'Phone must be exactly 10 digits.'

  if (!data.college.trim()) errors.college = 'College / University is required.'
  if (!data.degree.trim()) errors.degree = 'Degree is required.'
  if (!graduationYear) errors.graduationYear = 'Graduation year is required.'
  else if (!/^\d{4}$/.test(graduationYear) || +graduationYear < 1950 || +graduationYear > 2100) {
    errors.graduationYear = 'Must be a valid 4-digit year.'
  }

  if (!data.targetRole.trim()) errors.targetRole = 'Target role is required.'
  if (!data.targetCompanies.trim()) errors.targetCompanies = 'Target companies are required.'
  if (!data.experience.trim()) errors.experience = 'Experience level is required.'

  if (data.linkedIn.trim()) {
    const linkedInPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|profile)\/[A-Za-z0-9_-]+\/?$/
    if (!linkedInPattern.test(data.linkedIn.trim())) {
      errors.linkedIn = 'Enter a valid LinkedIn profile URL.'
    }
  }

  return errors
}

const normalizeProfileForm = (data) => ({
  firstName: data.firstName.trim(),
  lastName: data.lastName.trim(),
  phone: data.phone.trim(),
  college: data.college.trim(),
  degree: data.degree.trim(),
  graduationYear: data.graduationYear.toString().trim(),
  targetRole: data.targetRole.trim(),
  targetCompanies: data.targetCompanies.trim(),
  linkedIn: data.linkedIn.trim(),
  experience: data.experience.trim(),
})

const formsMatch = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function Field({ label, icon: Icon, error, children, optional }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-text-dark">
        {Icon && <Icon size={14} className="text-primary" />}
        {label}
        {optional && <span className="text-xs text-text-light ml-1">(optional)</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5" role="alert">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  )
}

function Input({ error, className = '', ...props }) {
  return (
    <input
      className={`
        w-full px-3.5 py-2.5 rounded-xl text-sm
        bg-[#f4f4f8] border text-text-dark placeholder:text-text-light
        transition-all duration-200 outline-none
        focus:ring-2 focus:ring-primary/20 focus:border-primary/40
        disabled:opacity-60 disabled:cursor-not-allowed
        ${error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-400' : 'border-transparent hover:border-border-light'}
        ${className}
      `}
      {...props}
    />
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-dark">{title}</h3>
        {subtitle && <p className="text-xs text-text-light mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function ReadOnlyBadge({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fafafa] border border-border-light">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-text-light leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-text-dark truncate">{value}</p>
      </div>
    </div>
  )
}

export default function EditProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [noChanges, setNoChanges] = useState(false)
  const [fetchErr, setFetchErr] = useState('')
  const [saveErr, setSaveErr] = useState('')
  const [fieldErrs, setFieldErrs] = useState({})
  const [readOnly, setReadOnly] = useState({
    email: '',
    plan: '',
    interviewCredits: 0,
    avatar: '',
  })
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    college: '',
    degree: '',
    graduationYear: '',
    targetRole: '',
    targetCompanies: '',
    linkedIn: '',
    experience: '',
  })
  const [savedForm, setSavedForm] = useState(null)

  const populateFromUser = (user) => {
    const onboardingData = user.onboardingData || {}
    const nextForm = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      college: onboardingData.college || '',
      degree: onboardingData.degree || '',
      graduationYear: onboardingData.graduationYear?.toString() || '',
      targetRole: onboardingData.targetRole || '',
      targetCompanies: onboardingData.targetCompanies || '',
      linkedIn: onboardingData.linkedIn || '',
      experience: onboardingData.experience || '',
    }

    setReadOnly({
      email: user.email || '',
      plan: user.plan || 'free',
      interviewCredits: user.interviewCredits ?? 0,
      avatar: user.avatar || '',
    })
    setForm(nextForm)
    setSavedForm(normalizeProfileForm(nextForm))
  }

  useEffect(() => {
    let active = true

    const fetchUser = async () => {
      try {
        setLoading(true)
        setFetchErr('')
        const data = await authAPI.getMe()
        if (!active) return
        populateFromUser(data.user)
      } catch (err) {
        if (!active) return
        const cachedUser = getUser()
        if (cachedUser) populateFromUser(cachedUser)
        else setFetchErr(err.message || 'Could not load profile data.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchUser()

    return () => {
      active = false
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrs[name]) {
      setFieldErrs(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
    if (success) setSuccess(false)
    if (noChanges) setNoChanges(false)
    if (saveErr) setSaveErr('')
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    setSuccess(false)
    setNoChanges(false)
    setSaveErr('')

    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrs(errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setFieldErrs({})

    const nextForm = normalizeProfileForm(form)
    if (savedForm && formsMatch(nextForm, savedForm)) {
      setNoChanges(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSaving(true)

    try {
      const data = await authAPI.updateProfile(nextForm)

      saveUser(getToken(), data.user)
      populateFromUser(data.user)
      setSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      window.setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      if (err.errors) {
        setFieldErrs(err.errors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setSaveErr(err.message || 'An unexpected error occurred.')
      }
    } finally {
      setSaving(false)
    }
  }

  const initials = `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`.toUpperCase() || '?'
  const planLabel = readOnly.plan === 'pro'
    ? 'Pro Plan'
    : readOnly.plan === 'premium'
      ? 'Premium Plan'
      : 'Free Plan'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center">
            <Loader2 size={22} className="text-white animate-spin" />
          </div>
          <p className="text-sm text-text-light">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (fetchErr) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white border border-border-light rounded-2xl p-8 text-center shadow-sm">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-dark mb-2">Couldn't load profile</h2>
          <p className="text-sm text-text-mid mb-6">{fetchErr}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] text-text-dark font-body">
      <header className="sticky top-0 z-30 border-b border-border-light bg-white/90 backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 h-14 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link
            to="/dashboard"
            className="justify-self-start flex items-center gap-1.5 text-sm text-text-mid hover:text-primary transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </Link>

          <h1 className="text-sm font-semibold text-text-dark">Edit Profile</h1>
          <div aria-hidden="true" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {success && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            Profile updated successfully.
          </div>
        )}

        {noChanges && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium">
            <AlertCircle size={16} className="flex-shrink-0" />
            No changes to save.
          </div>
        )}

        {saveErr && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {saveErr}
          </div>
        )}

        <div className="mb-8 flex items-center gap-5 p-5 rounded-2xl bg-white border border-border-light shadow-sm">
          {readOnly.avatar ? (
            <img
              src={readOnly.avatar}
              alt={`${form.firstName} ${form.lastName}`}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20 flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-text-dark truncate">
              {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : 'Your Name'}
            </h2>
            <p className="text-sm text-text-mid truncate">{readOnly.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/15">
                <Star size={10} />
                {planLabel}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f4f4f8] text-text-mid border border-border-light">
                <CreditCard size={10} />
                {readOnly.interviewCredits > 1000 ? '∞' : readOnly.interviewCredits} credit{readOnly.interviewCredits !== 1 && readOnly.interviewCredits <= 1000 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} noValidate>
          <div className="mb-6 p-6 rounded-2xl bg-white border border-border-light shadow-sm">
            <SectionHeader
              icon={User}
              title="Personal Information"
              subtitle="Your name and contact details"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" icon={User} error={fieldErrs.firstName}>
                <Input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Jane" error={fieldErrs.firstName} disabled={saving} />
              </Field>

              <Field label="Last Name" icon={User} error={fieldErrs.lastName}>
                <Input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" error={fieldErrs.lastName} disabled={saving} />
              </Field>

              <Field label="Phone Number" icon={Phone} error={fieldErrs.phone}>
                <Input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="10-digit number" maxLength={10} error={fieldErrs.phone} disabled={saving} />
              </Field>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-text-dark">
                  <Mail size={14} className="text-text-light" />
                  Email Address
                  <span className="text-xs text-text-light ml-1">(not editable)</span>
                </label>
                <input
                  value={readOnly.email}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#f4f4f8] border border-border-light text-text-light cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>

          <div className="mb-6 p-6 rounded-2xl bg-white border border-border-light shadow-sm">
            <SectionHeader
              icon={CreditCard}
              title="Account Details"
              subtitle="Managed by MockPrep support"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ReadOnlyBadge label="Current Plan" value={planLabel} icon={Star} />
              <ReadOnlyBadge label="Interview Credits" value={readOnly.interviewCredits > 1000 ? '∞ remaining' : `${readOnly.interviewCredits} remaining`} icon={CreditCard} />
            </div>
          </div>

          <div className="mb-6 p-6 rounded-2xl bg-white border border-border-light shadow-sm">
            <SectionHeader
              icon={GraduationCap}
              title="Education"
              subtitle="Your academic background"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="College / University" icon={Building2} error={fieldErrs.college}>
                <Input name="college" value={form.college} onChange={handleChange} placeholder="e.g. IIT Bombay" error={fieldErrs.college} disabled={saving} />
              </Field>

              <Field label="Degree" icon={BookOpen} error={fieldErrs.degree}>
                <Input name="degree" value={form.degree} onChange={handleChange} placeholder="e.g. B.Tech Computer Science" error={fieldErrs.degree} disabled={saving} />
              </Field>

              <Field label="Graduation Year" icon={GraduationCap} error={fieldErrs.graduationYear}>
                <Input name="graduationYear" type="number" value={form.graduationYear} onChange={handleChange} placeholder="e.g. 2027" min={1950} max={2100} error={fieldErrs.graduationYear} disabled={saving} />
              </Field>
            </div>
          </div>

          <div className="mb-6 p-6 rounded-2xl bg-white border border-border-light shadow-sm">
            <SectionHeader
              icon={Target}
              title="Career Goals"
              subtitle="Used to personalize your mock interviews"
            />

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Target Role" icon={Target} error={fieldErrs.targetRole}>
                  <Input name="targetRole" value={form.targetRole} onChange={handleChange} placeholder="e.g. Software Engineer" error={fieldErrs.targetRole} disabled={saving} />
                </Field>

                <Field label="Experience Level" icon={Briefcase} error={fieldErrs.experience}>
                  <select
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    disabled={saving}
                    className={`
                      w-full px-3.5 py-2.5 rounded-xl text-sm
                      bg-[#f4f4f8] border text-text-dark
                      transition-all duration-200 outline-none
                      focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                      disabled:opacity-60 disabled:cursor-not-allowed
                      appearance-none cursor-pointer
                      ${fieldErrs.experience ? 'border-red-400 focus:ring-red-500/20 focus:border-red-400' : 'border-transparent hover:border-border-light'}
                    `}
                  >
                    {experienceOptions.map(option => (
                      <option key={option.value} value={option.value} disabled={option.value === ''}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrs.experience && (
                    <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5" role="alert">
                      <AlertCircle size={11} />
                      {fieldErrs.experience}
                    </p>
                  )}
                </Field>
              </div>

              <Field label="Target Companies" icon={Building2} error={fieldErrs.targetCompanies}>
                <Input name="targetCompanies" value={form.targetCompanies} onChange={handleChange} placeholder="e.g. Google, Microsoft, Amazon" error={fieldErrs.targetCompanies} disabled={saving} />
              </Field>

              <Field label="LinkedIn Profile" icon={LinkIcon} error={fieldErrs.linkedIn} optional>
                <Input name="linkedIn" type="url" value={form.linkedIn} onChange={handleChange} placeholder="https://linkedin.com/in/your-name" error={fieldErrs.linkedIn} disabled={saving} />
              </Field>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="
                w-full sm:w-auto flex items-center justify-center gap-2
                px-8 py-3 rounded-xl
                bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF]
                disabled:opacity-60 disabled:cursor-not-allowed
                text-white text-sm font-semibold
                transition-all duration-200
                shadow-lg shadow-primary/20
                hover:shadow-primary/30
                active:scale-[0.98]
              "
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>

            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl border border-border-light bg-white text-text-mid hover:text-primary hover:border-primary/30 text-sm font-medium transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
