import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { interviewAPI } from '../lib/api'
import { getUser } from '../lib/auth'

// ─── loading steps config ────────────────────────────────────────────────────
const LOADING_STEPS = [
  { label: 'Uploading resume',       sub: 'Securely sending your file',          bar: 25 },
  { label: 'Analysing your profile', sub: 'Extracting skills and experience',    bar: 55 },
  { label: 'Generating questions',   sub: 'Tailoring to your role and mode',     bar: 80 },
  { label: 'Almost ready',           sub: 'Putting the final pieces together',   bar: 100 },
]

// ─── instructions config ─────────────────────────────────────────────────────
const RULES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: '#5358F3',
    bg: '#EEEDFE',
    title: 'Question limit',
    desc: 'You have a fixed number of questions based on your selected session length.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: '#9F3BDF',
    bg: '#F5EAFE',
    title: 'Camera & microphone',
    desc: 'Your video and audio will be recorded throughout the session. Make sure both are working before you start.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#0F6E56',
    bg: '#E1F5EE',
    title: 'Answer completely',
    desc: 'Speak clearly and take your time. The AI listens to full answers — there are no trick questions.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M18 8h1a4 4 0 010 8h-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M6 1v3M10 1v3M14 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: '#BA7517',
    bg: '#FAEEDA',
    title: 'Stable environment',
    desc: 'Find a quiet place with a stable internet connection. Avoid switching tabs or apps during the session.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: '#185FA5',
    bg: '#E6F1FB',
    title: 'One attempt only',
    desc: 'Each interview link is single-use. Once you start, the session cannot be restarted or re-entered.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: '#993556',
    bg: '#FBEAF0',
    title: 'Resume-based questions',
    desc: 'The AI has read your resume. Expect questions that reference your listed experience, skills, and projects.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    color: '#D92D20',
    bg: '#FEE4E2',
    title: 'Time limit',
    desc: 'The answer time limit is 2 minutes per question. Keep your answers concise.',
  },
]

// ─── CheckIcon ───────────────────────────────────────────────────────────────
function CheckIcon({ done }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        opacity: done ? 1 : 0,
        transform: done ? 'scale(1)' : 'scale(0)',
        transition: 'opacity 0.3s, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <circle cx="12" cy="12" r="10" fill="#22c55e" />
      <path d="M7 12l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── SpinnerIcon ─────────────────────────────────────────────────────────────
function SpinnerIcon({ show }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      style={{
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s',
        animation: 'iv-spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    >
      <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3" fill="none" />
      <path d="M12 2a10 10 0 0110 10" stroke="#5358F3" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// ─── LoadingScreen ────────────────────────────────────────────────────────────
function LoadingScreen({ currentStep, stepsDone }) {
  const barWidth = currentStep >= 0 ? LOADING_STEPS[currentStep].bar : 0

  return (
    <div style={styles.centered}>
      <div style={styles.loadingWrap}>
        {/* logo mark */}
        <div style={styles.logoMark}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="white" />
          </svg>
        </div>

        <h2 style={styles.loadingTitle}>Preparing your interview</h2>

        <p
          key={currentStep}
          style={{
            ...styles.loadingSubtitle,
            animation: 'iv-fadeUp 0.35s ease',
          }}
        >
          {currentStep >= 0 ? LOADING_STEPS[currentStep].sub : ''}
        </p>

        {/* progress bar */}
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${barWidth}%`,
              transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>

        {/* steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          {LOADING_STEPS.map((step, i) => {
            const isActive = currentStep === i
            const isDone = stepsDone.includes(i)
            return (
              <div
                key={i}
                style={{
                  ...styles.stepRow,
                  opacity: isActive || isDone ? 1 : 0.3,
                  borderColor: isActive ? 'rgba(83,88,243,0.3)' : 'var(--color-border-tertiary, rgba(0,0,0,0.1))',
                }}
              >
                <div style={styles.stepIconWrap}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={styles.stepLabel}>{step.label}</p>
                  <p style={styles.stepSub}>{step.sub}</p>
                </div>
                {isActive && !isDone && <SpinnerIcon show />}
                <CheckIcon done={isDone} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── InstructionsScreen ───────────────────────────────────────────────────────
function InstructionsScreen({ sessionState, onStart }) {
  const [checked, setChecked] = useState(false)
  const { role, company, mode, durationMinutes } = sessionState

  const modeLabel = {
    technical: 'Technical', hr: 'Behavioral',
    mixed: 'Mixed', casestudy: 'Case Study',
  }[mode] || mode

  return (
    <div
      style={{
        ...styles.centered,
        animation: 'iv-fadeIn 0.5s ease',
        alignItems: 'flex-start',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* header */}
        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <div style={{ ...styles.logoMark, margin: '0 auto 1rem' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="white" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: 'var(--color-text-primary)' }}>
            Before you begin
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            Read these instructions carefully. You cannot pause once the interview starts.
          </p>
        </div>

        {/* session summary pill row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.75rem' }}>
          {[
            { label: 'Role', value: role },
            company && { label: 'Company', value: company },
            { label: 'Mode', value: modeLabel },
            { label: 'Questions', value: `${durationMinutes}` },
          ].filter(Boolean).map((item) => (
            <div key={item.label} style={styles.pill}>
              <span style={{ color: 'var(--color-text-secondary)', marginRight: 4 }}>{item.label}:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* rules grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
          {RULES.map((rule, i) => (
            <div
              key={i}
              style={{
                ...styles.ruleCard,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: rule.bg,
                  color: rule.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {rule.icon}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 3px' }}>
                  {rule.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.55 }}>
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* checkbox acknowledgement */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            background: checked ? 'rgba(83,88,243,0.04)' : 'var(--color-background-primary)',
            border: `1.5px solid ${checked ? '#5358F3' : 'var(--color-border-tertiary, rgba(0,0,0,0.1))'}`,
            borderRadius: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '1.25rem',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              border: `2px solid ${checked ? '#5358F3' : 'rgba(0,0,0,0.2)'}`,
              background: checked ? '#5358F3' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          >
            {checked && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ display: 'none' }}
          />
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
            I have read and understood all the instructions above
          </span>
        </label>

        {/* start button */}
        <button
          onClick={onStart}
          disabled={!checked}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 14,
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            color: 'white',
            cursor: checked ? 'pointer' : 'not-allowed',
            background: checked
              ? 'linear-gradient(135deg, #5358F3 0%, #883BE8 50%, #9F3BDF 100%)'
              : 'rgba(0,0,0,0.12)',
            transition: 'all 0.25s',
            letterSpacing: '0.01em',
          }}
        >
          {checked ? "I'm ready — Start Interview" : 'Acknowledge the instructions to continue'}
        </button>

      </div>
    </div>
  )
}

// ─── main exported component ──────────────────────────────────────────────────
export default function InterviewPrepFlow({ resumeFile, role, company, mode, duration, candidateImageVector, existingResumeData }) {
  // phase: 'loading' | 'instructions'
  const [phase, setPhase] = useState('loading')
  const [currentStep, setCurrentStep] = useState(-1)
  const [stepsDone, setStepsDone] = useState([])
  const [sessionState, setSessionState] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const user = getUser()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    runFlow()
  }, [])

  const advance = (stepIndex, barOverride) => {
    setCurrentStep(stepIndex)
  }

  const complete = (stepIndex) => {
    setStepsDone((prev) => [...prev, stepIndex])
  }

  const pause = (ms) => new Promise((r) => setTimeout(r, ms))

  async function runFlow() {
    try {
      let uploaded

      if (existingResumeData) {
        // Skip upload — use existing resume from database
        advance(0)
        if (candidateImageVector) {
          await interviewAPI.updateFaceVector(existingResumeData.resume_id, candidateImageVector)
        }
        await pause(400)
        uploaded = {
          candidateId: existingResumeData.candidate_id,
          resumeId: existingResumeData.resume_id,
        }
        complete(0)
      } else {
        // Step 0 — upload resume (send raw file, no base64 encoding)
        advance(0)
        const res = await interviewAPI.uploadResume({
          file: resumeFile,
          candidateImageVector,
          name: user?.firstName || 'User',
          email: user?.email,
        })
        uploaded = res
        complete(0)
      }

      // Step 1 — analyse profile (brief pause, work happens server-side)
      advance(1)
      await pause(700)
      complete(1)

      // Step 2 — generate questions
      advance(2)
      const started = await interviewAPI.start({
        candidateId: uploaded.candidateId,
        resumeId: uploaded.resumeId,
        role,
        company,
        mode,
        durationMinutes: Number(duration),
        resumeFile: resumeFile ? {
          name: resumeFile.name,
          mimeType: resumeFile.type,
          size: resumeFile.size,
        } : undefined,
      })
      complete(2)

      // Step 3 — final prep
      advance(3)
      await pause(600)
      complete(3)

      // store session, switch to instructions
      const state = {
        sessionId: started.session.id,
        interviewId: started.session.interviewId,
        firstQuestion: started.session.firstQuestion,
        questionNumber: started.session.questionNumber,
        totalQuestions: started.session.totalQuestions,
        role: started.session.role,
        company: started.session.company,
        mode: started.session.mode,
        durationMinutes: started.session.durationMinutes,
      }
      sessionStorage.setItem('mockprepInterviewSession', JSON.stringify(state))
      setSessionState(state)

      await pause(400)
      setPhase('instructions')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please go back and try again.')
    }
  }

  const handleStart = () => {
    navigate('/interview', { state: sessionState })
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>{error}</p>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            Go back and try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes iv-spin   { to { transform: rotate(360deg); } }
        @keyframes iv-fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes iv-fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary, #f5f5f7)' }}>
        {/* top bar */}
        <div style={styles.topBar}>
          <div style={styles.logoMark}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="white" />
            </svg>
          </div>
          <span className="font-heading font-bold text-text-dark">MockPrep<span className="text-primary">.ai</span></span>
          <div style={{ flex: 1 }} />
          {phase === 'loading' && (
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Setting up your session…</span>
          )}
          {phase === 'instructions' && (
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✓ Session ready</span>
          )}
        </div>

        {phase === 'loading' && (
          <LoadingScreen currentStep={currentStep} stepsDone={stepsDone} />
        )}

        {phase === 'instructions' && sessionState && (
          <InstructionsScreen sessionState={sessionState} onStart={handleStart} />
        )}
      </div>
    </>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = {
  centered: {
    minHeight: 'calc(100vh - 52px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
  },
  topBar: {
    height: 52,
    background: 'var(--color-background-primary, #fff)',
    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #5358F3, #9F3BDF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  loadingWrap: {
    width: '100%',
    maxWidth: 460,
    textAlign: 'center',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: '0 0 4px',
  },
  loadingSubtitle: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    margin: '0 0 1.5rem',
    minHeight: 18,
  },
  barTrack: {
    background: 'rgba(0,0,0,0.07)',
    borderRadius: 99,
    height: 5,
    marginBottom: '1.75rem',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #5358F3, #9F3BDF)',
    borderRadius: 99,
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: 'var(--color-background-primary, #fff)',
    border: '0.5px solid',
    borderRadius: 12,
    transition: 'opacity 0.4s, border-color 0.4s',
  },
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--color-text-secondary)',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: '0 0 2px',
  },
  stepSub: {
    fontSize: 11,
    color: 'var(--color-text-secondary)',
    margin: 0,
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    borderRadius: 99,
    background: 'var(--color-background-primary, #fff)',
    border: '0.5px solid rgba(0,0,0,0.1)',
    fontSize: 12,
  },
  ruleCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '13px 15px',
    background: 'var(--color-background-primary, #fff)',
    border: '0.5px solid rgba(0,0,0,0.08)',
    borderRadius: 12,
    animation: 'iv-fadeUp 0.4s ease both',
  },
  backBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.15)',
    background: 'transparent',
    fontSize: 13,
    cursor: 'pointer',
    color: 'var(--color-text-primary)',
  },
}