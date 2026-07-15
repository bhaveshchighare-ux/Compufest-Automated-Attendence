import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser } from '../lib/auth'
import InterviewPrepFlow from './InterviewPrepFlow'
import ResumeScanLoader from '../components/loaders/ResumeScanLoader'
import BiometricsLoader from '../components/loaders/BiometricsLoader'
import { loadFaceApi, getFaceEmbedding } from '../lib/faceApiHelper'
import { interviewAPI } from '../lib/api'

const interviewModes = [
  { id: 'technical', label: 'Technical', desc: 'DSA, system design, core concepts' },
  { id: 'hr', label: 'Behavioral', desc: 'STAR stories, motivation, soft skills' },
  { id: 'mixed', label: 'Mixed', desc: 'Technical and behavioral practice' },
]

const durations = [
  { id: '5', label: '5 Questions', desc: 'Quick practice' },
  { id: '8', label: '8 Questions', desc: 'Standard session' },
  { id: '10', label: '10 Questions', desc: 'Full interview' },
]

const companies = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Flipkart', 'TCS']
const maxResumeBytes = 5 * 1024 * 1024

const isAllowedResume = (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return ['pdf', 'docx'].includes(extension)
}

export default function StartInterview() {
  const navigate = useNavigate()
  const user = getUser()
  const defaultRole = user?.onboardingData?.targetRole || ''

  const [resume, setResume] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [existingResume, setExistingResume] = useState(null)
  const [useExistingResume, setUseExistingResume] = useState(false)
  const [checkingResume, setCheckingResume] = useState(true)
  const PREDEFINED_ROLES = [
    'Software Engineer',
    'Frontend Engineer',
    'Backend Engineer',
    'Fullstack Engineer',
    'Data Scientist',
    'Product Manager'
  ]

  const isPremiumUser = user?.plan === 'premium'
  const isPredefined = PREDEFINED_ROLES.some(r => r.toLowerCase() === defaultRole.trim().toLowerCase())
  const initialRole = isPredefined
    ? PREDEFINED_ROLES.find(r => r.toLowerCase() === defaultRole.trim().toLowerCase())
    : PREDEFINED_ROLES[0]

  const [mode, setMode] = useState(user?.plan === 'free' ? 'technical' : 'mixed')
  const [duration, setDuration] = useState('8')
  const [role, setRole] = useState(isPremiumUser ? defaultRole : initialRole)
  const [roleType, setRoleType] = useState(isPremiumUser && !isPredefined ? 'custom' : 'standard')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [customCompany, setCustomCompany] = useState('')
  const [error, setError] = useState('')
  const [prepState, setPrepState] = useState(null)

  const [checkingCredits, setCheckingCredits] = useState(true)
  const [hasNoCredits, setHasNoCredits] = useState(false)

  // Proctoring and photo state
  const [candidateImage, setCandidateImage] = useState(null)
  const [candidateImageVector, setCandidateImageVector] = useState(null)
  const [isProcessingFace, setIsProcessingFace] = useState(false)
  const [biometricStatus, setBiometricStatus] = useState('idle')
  const [isScanningResume, setIsScanningResume] = useState(false)
  const [needsCandidateImage, setNeedsCandidateImage] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const [agreedToProctoring, setAgreedToProctoring] = useState(false)

  const company = useMemo(() => customCompany.trim() || selectedCompany, [customCompany, selectedCompany])

  useEffect(() => {
    // Warm up face-api models client-side in background as soon as the form loads!
    const initFaceApi = async () => {
      try {
        await loadFaceApi()
      } catch (err) {
        console.error("Background face-api load failed:", err)
      }
    }
    initFaceApi()

    // Check for existing resume on file
    const checkResume = async () => {
      try {
        const result = await interviewAPI.checkExistingResume()
        if (result.has_resume) {
          setExistingResume(result)
          setUseExistingResume(true)
        }
      } catch (err) {
        console.warn("Resume check failed:", err)
      } finally {
        setCheckingResume(false)
      }
    }
    checkResume()

    // Also check for user credits
    const checkCredits = async () => {
      try {
        const { dashboard } = await interviewAPI.getDashboard()
        const latestUser = dashboard?.user
        const hasCredit = latestUser?.plan !== 'free' || Number(latestUser?.interviewCredits || 0) > 0
        if (!hasCredit) {
          setHasNoCredits(true)
        }
      } catch (err) {
        console.error("Failed to check credits:", err)
      } finally {
        setCheckingCredits(false)
      }
    }
    checkCredits()
  }, [])

  const handleBiometricLoaderComplete = useCallback(() => {
    setBiometricStatus('idle')
  }, [])

  // ── once Begin Interview is clicked, hand off to InterviewPrepFlow ──────────
  if (prepState) {
    return (
      <InterviewPrepFlow
        resumeFile={prepState.resumeFile}
        role={prepState.role}
        company={prepState.company}
        mode={prepState.mode}
        duration={prepState.duration}
        candidateImageVector={prepState.candidateImageVector}
        existingResumeData={prepState.existingResumeData}
      />
    )
  }

  if (checkingCredits) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  if (hasNoCredits) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f7ff] via-[#f0f0f0] to-[#f5f3ff] font-body flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-border-light rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="font-heading font-bold text-2xl text-text-dark">Credits Exhausted</h1>
          <p className="font-body text-text-mid text-sm mt-2 mb-8">
            You have no interview credits remaining. Upgrade to Pro to unlock unlimited mock interviews and detailed analytics.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-semibold py-3.5 rounded-xl hover:shadow-lg transition-shadow"
            >
              Upgrade to Pro
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white border border-border-light text-text-dark font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const waitForLoaderPaint = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 80)
        })
      })
    })

  const scanResumeForCandidateImage = async (resumeFile) => {
    try {
      setIsScanningResume(true)
      setError('')
      const result = await interviewAPI.scanResumeFace({ file: resumeFile })
      if (result && result.has_face_image) {
        setNeedsCandidateImage(false)
        setScanMessage('Profile photo detected in resume.')
      } else {
        setNeedsCandidateImage(true)
        setScanMessage('No clear profile photo found in resume.')
      }
    } catch (err) {
      console.error("Resume scan error:", err)
      setNeedsCandidateImage(true)
    } finally {
      setIsScanningResume(false)
    }
  }

  const handleImageChange = async (e) => {
    const selectedImage = e.target.files?.[0]
    if (!selectedImage) return

    if (!selectedImage.type.startsWith("image/")) {
      setError("Please upload a valid image file.")
      setCandidateImage(null)
      setCandidateImageVector(null)
      setBiometricStatus('idle')
      return
    }

    try {
      setIsProcessingFace(true)
      setBiometricStatus('processing')
      setError('')
      setScanMessage('')
      await waitForLoaderPaint()

      const imgUrl = URL.createObjectURL(selectedImage)
      const img = new Image()
      img.src = imgUrl

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const vector = await getFaceEmbedding(img)
      URL.revokeObjectURL(imgUrl)

      if (!vector) {
        setError("No clear front-facing face detected. Please ensure your face is well-lit, fully visible, and directly facing the camera.")
        setCandidateImage(null)
        setCandidateImageVector(null)
        setBiometricStatus('error')
        setScanMessage('')
        e.target.value = ""
        return
      }

      setCandidateImage(selectedImage)
      setCandidateImageVector(vector)
      setBiometricStatus('success')
      setScanMessage("✅ Biometric profile registered successfully.")
      setError('')
    } catch (err) {
      console.error("Local biometric extraction failed:", err)
      setError("Failed to process photo biometric data locally. Please try a different photo.")
      setCandidateImage(null)
      setCandidateImageVector(null)
      setBiometricStatus('error')
    } finally {
      setIsProcessingFace(false)
    }
  }

  const setResumeFile = (file) => {
    setError('')
    if (!file) return
    if (!isAllowedResume(file)) {
      setError('Upload a PDF or DOCX resume.')
      return
    }
    if (file.size > maxResumeBytes) {
      setError('Resume must be 5MB or smaller.')
      return
    }
    setResume(file)
    setScanMessage('')
    scanResumeForCandidateImage(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    setResumeFile(e.dataTransfer.files[0])
  }

  const handleFile = (e) => {
    setResumeFile(e.target.files[0])
  }

  const handleBegin = async () => {
    const cleanedRole = role.trim()
    if (!useExistingResume && !resume) return setError('Upload your resume before starting.')
    if (needsCandidateImage && !candidateImageVector) {
      return setError('A profile photo is required for identity verification during the interview.')
    }
    if (!cleanedRole) return setError('Enter the role you want to practice for.')
    if (!agreedToProctoring) return setError('You must agree to the proctoring rules.')

    // 1. Ask for camera and mic permissions early
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach(track => track.stop())
    } catch (err) {
      return setError('Camera and microphone permissions are required to begin the interview.')
    }

    // 2. Enter full screen and lock keyboard early
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
      if (navigator.keyboard?.lock) {
        await navigator.keyboard.lock()
      }
    } catch (err) {
      console.warn('Fullscreen/keyboard lock failed:', err)
    }

    if (useExistingResume && existingResume) {
      setPrepState({
        resumeFile: null,
        role: cleanedRole,
        company,
        mode,
        duration,
        candidateImageVector,
        existingResumeData: existingResume,
      })
    } else {
      setPrepState({ resumeFile: resume, role: cleanedRole, company, mode, duration, candidateImageVector })
    }
  }


  return (
    <div className="min-h-screen bg-[#f0f0f0] font-body">
      <ResumeScanLoader visible={isScanningResume} />
      <BiometricsLoader
        visible={isProcessingFace || biometricStatus === 'success' || biometricStatus === 'error'}
        status={biometricStatus === 'idle' ? 'processing' : biometricStatus}
        onComplete={handleBiometricLoaderComplete}
      />

      <div className="bg-white border-b border-border-light px-6 py-4 flex items-center gap-3 sticky top-0 z-50">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-text-mid hover:text-primary font-body text-sm transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Interview Setup
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── Resume Upload ── */}
        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Upload Your Resume</h2>

          {/* Existing resume banner */}
          {existingResume && !checkingResume && (
            <div className={`mb-4 border rounded-2xl p-5 transition-all duration-200 ${useExistingResume
              ? 'border-green-300 bg-green-50'
              : 'border-border-light bg-white'
              }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#22c55e" strokeWidth="1.5" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-text-dark text-sm truncate">{existingResume.filename}</p>
                  <p className="font-body text-text-light text-xs">
                    Last updated: {existingResume.updated_at ? new Date(existingResume.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseExistingResume(true)
                    setResume(null)
                    setScanMessage('')
                    setNeedsCandidateImage(true)
                    setCandidateImage(null)
                    setCandidateImageVector(null)
                    setError('')
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${useExistingResume
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-white border border-border-light text-text-mid hover:border-green-300 hover:text-green-600'
                    }`}
                >
                  ✓ Use this resume
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseExistingResume(false)
                    setError('')
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${!useExistingResume
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white border border-border-light text-text-mid hover:border-primary/40 hover:text-primary'
                    }`}
                >
                  Upload new resume
                </button>
              </div>
            </div>
          )}

          {/* Upload area — shown when no existing resume OR user chose to upload new */}
          {(!existingResume || !useExistingResume) && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer ${dragging
                ? 'border-primary bg-primary/5'
                : resume
                  ? 'border-green-400 bg-green-50'
                  : 'border-border-light bg-white hover:border-primary/40 hover:bg-primary/5'
                }`}
            >
              {resume ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-body font-semibold text-text-dark text-sm">{resume.name}</p>
                  <p className="font-body text-text-light text-xs mt-1">
                    {(resume.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {scanMessage && !candidateImage && (
                    <p className={`font-body text-xs mt-2 ${needsCandidateImage ? "text-amber-600" : "text-green-600"}`}>
                      {scanMessage}
                    </p>
                  )}
                  {candidateImage && (
                    <p className="font-body text-xs mt-2 text-green-600">
                      Identity verification photo attached.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setResume(null)
                      setScanMessage('')
                      setNeedsCandidateImage(false)
                      setCandidateImage(null)
                      setCandidateImageVector(null)
                    }}
                    className="mt-3 text-xs text-red-500 hover:text-red-600 font-body transition-colors"
                  >
                    Remove
                  </button>
                  {existingResume && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseExistingResume(true)
                        setResume(null)
                        setScanMessage('')
                        setNeedsCandidateImage(false)
                        setCandidateImage(null)
                        setCandidateImageVector(null)
                      }}
                      className="mt-2 text-xs text-primary hover:text-primary/80 font-body transition-colors"
                    >
                      ← Use existing resume instead
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#f4f4f8] flex items-center justify-center mb-4">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="#8888aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 16.5A4.5 4.5 0 0015.5 12H14a6 6 0 10-11.8 1.5" stroke="#8888aa" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="font-body font-semibold text-text-dark text-sm mb-1">
                    Drag and drop your resume here
                  </p>
                  <p className="font-body text-text-light text-xs mb-4">PDF or DOCX, max 5MB</p>
                  <label className="cursor-pointer border border-border-light hover:border-primary/40 bg-white text-text-mid hover:text-primary font-body text-xs px-4 py-2 rounded-lg transition-all duration-200">
                    Browse Files
                    <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFile} />
                  </label>
                  {existingResume && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseExistingResume(true)
                        setResume(null)
                        setScanMessage('')
                        setError('')
                      }}
                      className="mt-4 text-xs text-primary hover:text-primary/80 font-body transition-colors"
                    >
                      ← Use existing resume instead
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Candidate Image Upload ── */}
        {needsCandidateImage && (
          <div>
            <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Identity Verification Photo</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <p className="font-body text-sm text-amber-800 mb-4">
                We couldn't find a photo in your resume. Please upload a clear profile picture for proctoring verification.
              </p>
              <label className="cursor-pointer border border-border-light hover:border-primary/40 bg-white text-text-mid hover:text-primary font-body text-xs px-4 py-2 rounded-lg transition-all duration-200 inline-block">
                Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {candidateImage && (
                <div className="mt-4">
                  <img
                    src={URL.createObjectURL(candidateImage)}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg border-2 border-primary"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Practice Target ── */}
        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Practice Target</h2>
          <div className="grid gap-4 bg-white border border-border-light rounded-2xl p-5">
            <label className="grid gap-2">
              <span className="font-body text-sm font-semibold text-text-dark">Role Selection</span>
              <div className="flex gap-4 mb-1">
                <label className="flex items-center gap-2 text-sm font-body cursor-pointer text-text-dark">
                  <input
                    type="radio"
                    name="roleType"
                    checked={roleType === 'standard'}
                    onChange={() => {
                      setRoleType('standard')
                      setRole(PREDEFINED_ROLES[0])
                    }}
                    className="w-4 h-4 text-primary"
                  />
                  Standard Role
                </label>
                <label className="flex items-center gap-2 text-sm font-body cursor-pointer text-text-dark">
                  <input
                    type="radio"
                    name="roleType"
                    checked={roleType === 'custom'}
                    onChange={() => {
                      if (!isPremiumUser) {
                        setError('Custom role targeting requires the Premium plan. Upgrade to define custom roles.')
                        return
                      }
                      setRoleType('custom')
                      setRole('')
                    }}
                    className="w-4 h-4 text-primary"
                  />
                  Custom Role {!isPremiumUser && '🔒'}
                </label>
              </div>
            </label>

            {roleType === 'standard' ? (
              <label className="grid gap-2">
                <span className="font-body text-sm font-semibold text-text-dark">Select Standard Role</span>
                <select
                  value={PREDEFINED_ROLES.includes(role) ? role : PREDEFINED_ROLES[0]}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-border-light px-4 py-3 text-sm outline-none focus:border-primary bg-white"
                >
                  {PREDEFINED_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="grid gap-2 relative group">
                <span className="font-body text-sm font-semibold text-text-dark">Custom Target Role</span>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Machine Learning Engineer..."
                  className="w-full rounded-xl border border-border-light px-4 py-3 text-sm outline-none focus:border-primary bg-white"
                />
              </label>
            )}

            <label className="grid gap-2">
              <span className="font-body text-sm font-semibold text-text-dark">Company focus</span>
              <input
                value={customCompany}
                onChange={(e) => {
                  setCustomCompany(e.target.value)
                  if (e.target.value) setSelectedCompany('')
                }}
                placeholder="Optional custom company"
                className="w-full rounded-xl border border-border-light px-4 py-3 text-sm outline-none focus:border-primary bg-white"
              />
            </label>
          </div>
        </div>

        {/* ── Interview Mode ── */}
        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Select Interview Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {interviewModes.map((item) => {
              const isLocked = user?.plan === 'free' && item.id !== 'technical'

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      setError('Only the Technical domain is available on the Free plan. Upgrade to Pro to unlock all domains!')
                      return
                    }
                    setMode(item.id)
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all duration-200 relative ${isLocked
                    ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                    : mode === item.id
                      ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                      : 'border-border-light bg-white hover:border-primary/30 hover:bg-primary/5'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <p className={`font-heading font-semibold text-sm mb-0.5 ${isLocked ? 'text-slate-500' : mode === item.id ? 'text-primary' : 'text-text-dark'}`}>
                      {item.label}
                    </p>
                    {isLocked && (
                      <svg className="text-slate-400" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                      </svg>
                    )}
                  </div>
                  <p className="font-body text-text-light text-xs leading-relaxed">{item.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Questions ── */}
        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Number of Questions</h2>
          <div className="grid grid-cols-3 gap-3">
            {durations.map((item) => {
              const isLocked = item.id === '10' && user?.plan !== 'premium'
              return (
               <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isLocked) return;
                  setDuration(item.id)
                }}
                className={`text-left p-4 rounded-2xl border transition-all duration-200 relative ${isLocked 
                  ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                  : duration === item.id
                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border-light bg-white hover:border-primary/30 hover:bg-primary/5'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <p className={`font-heading font-semibold text-sm mb-0.5 ${isLocked ? 'text-slate-500' : duration === item.id ? 'text-primary' : 'text-text-dark'}`}>
                    {item.label}
                  </p>
                  {isLocked && (
                    <svg className="text-slate-400" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                  )}
                </div>
                <p className={`font-body text-xs leading-relaxed ${isLocked ? 'text-slate-400' : 'text-text-light'}`}>{item.desc}</p>
              </button>
              )
            })}
          </div>
        </div>

        {/* ── Proctoring Agreement ── */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="pt-1">
              <input
                type="checkbox"
                checked={agreedToProctoring}
                onChange={(e) => setAgreedToProctoring(e.target.checked)}
                className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
              />
            </div>
            <span className="font-body text-sm text-text-dark leading-relaxed">
              <strong>Proctoring Agreement:</strong> I confirm that I have closed all other browser tabs and applications. I understand that navigating away from the interview screen or using disallowed materials will result in immediate termination of the session.
            </span>
          </label>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="button"
          onClick={handleBegin}
          disabled={isScanningResume || isProcessingFace}
          className="w-full bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-4 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Begin Interview
        </button>

      </div>
    </div>
  )
}