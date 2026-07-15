import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { interviewAPI } from '../lib/api'

const getStoredSessionId = () => {
  try {
    const stored = sessionStorage.getItem('mockprepInterviewSession')
    return stored ? JSON.parse(stored)?.sessionId : null
  } catch {
    return null
  }
}

const scoreColor = (score) => {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#5B4FF5'
  return '#f97316'
}

const titleForScore = (score) => {
  if (score >= 85) return 'Strong practice round'
  if (score >= 70) return 'Good progress'
  if (score >= 50) return 'Building momentum'
  return 'Focused practice needed'
}

const scoreToPercent = (value) => {
  if (value === null || value === undefined || value === '') return null

  const rawText = String(value).trim()
  const directNumber = Number(value)
  const number = Number.isFinite(directNumber)
    ? directNumber
    : Number(rawText.match(/-?\d+(\.\d+)?/)?.[0])
  if (!Number.isFinite(number)) return null
  if (number > 0 && number < 1) return Math.round(Math.max(0, Math.min(number * 100, 100)))
  if (/\/\s*10\b/i.test(rawText)) return Math.round(Math.max(0, Math.min(number * 10, 100)))
  return Math.round(Math.max(0, Math.min(number, 100)))
}

const firstText = (...values) => (
  values.find((value) => value !== null && value !== undefined && String(value).trim() !== '')
)

const negativeEvaluationPattern = /\b(vague|unrelated|irrelevant|incorrect|failed|poor|weak|unclear|not clear|did not|does not|no clear|lacks?|lack of|insufficient|incomplete|unable|inability|needs? improvement|not enough|no specific|no relevant)\b/i

const hasNegativeEvaluation = (...values) => (
  values.some((value) => negativeEvaluationPattern.test(String(value || '')))
)

const guardedScore = (score, ...evaluationText) => {
  const normalizedScore = scoreToPercent(score)
  if (hasNegativeEvaluation(...evaluationText)) {
    return normalizedScore === null ? 20 : Math.min(normalizedScore, 20)
  }
  return normalizedScore
}

const formatQuestionScore = (score) => {
  if (score === null || score === undefined) return ''
  const scoreOutOfTen = score / 10
  return `${Number.isInteger(scoreOutOfTen) ? scoreOutOfTen : scoreOutOfTen.toFixed(1)}/10`
}

function ScoreBar({ label, score, feedback }) {
  const safeScore = guardedScore(score, feedback)
  return (
    <div>
      <div className="flex justify-between gap-3 mb-1">
        <span className="font-body text-text-mid text-sm">{label}</span>
        <span className="font-body font-semibold text-sm" style={{ color: safeScore === null ? '#8888aa' : scoreColor(safeScore) }}>
          {safeScore === null ? 'Not scored' : `${safeScore}%`}
        </span>
      </div>
      <div className="h-2 bg-[#f4f4f8] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${safeScore ?? 0}%`, background: scoreColor(safeScore ?? 0) }}
        />
      </div>
      {feedback && <p className="font-body text-text-light text-xs leading-relaxed mt-2">{feedback}</p>}
    </div>
  )
}

const normalizeQuestionFeedback = (items = []) => (
  items.map((item, index) => {
    const source = item && typeof item === 'object' ? item : { feedback: item }
    const questionNumber = firstText(
      source.questionNumber,
      source.question_number,
      source.questionNo,
      source.question_no,
      index + 1
    )
    return {
      questionNumber,
      question: firstText(source.question, source.prompt, source.label, `Question ${questionNumber}`),
      answer: firstText(source.answer, source.candidate_answer, source.candidateAnswer, ''),
      answerSummary: firstText(source.answerSummary, source.answer_summary, source.summary, ''),
      feedback: firstText(source.feedback, source.comment, source.assessment, source.evaluation, ''),
      improvement: firstText(source.improvement, source.recommendation, source.suggestion, source.next_step, source.nextStep, ''),
      section: firstText(source.section, source.type, ''),
      score: guardedScore(
        firstText(source.score, source.average_score, source.averageScore, source.rating),
        source.answerSummary,
        source.answer_summary,
        source.summary,
        source.feedback,
        source.comment,
        source.assessment,
        source.evaluation,
        source.improvement,
        source.recommendation,
        source.suggestion
      ),
      answerQualityScore: source.answerQualityScore ?? null,
      communicationScore: source.communicationScore ?? null,
      technicalDomainScore: source.technicalDomainScore ?? null,
      strengths: Array.isArray(source.strengths) ? source.strengths : [],
      areasForImprovement: Array.isArray(source.areasForImprovement) ? source.areasForImprovement : [],
      missingConcepts: Array.isArray(source.missingConcepts) ? source.missingConcepts : [],
      interviewerExpectation: source.interviewerExpectation ?? '',
      strongAnswerGuidance: source.strongAnswerGuidance ?? '',
      personalizedCoaching: source.personalizedCoaching ?? '',
    }
  })
)

function FeedbackList({ title, items, tone }) {
  const color = tone === 'good' ? '#22c55e' : tone === 'warn' ? '#f97316' : '#5B4FF5'

  return (
    <div className="bg-white border border-border-light rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="font-heading font-semibold text-text-dark text-sm mb-4">{title}</h3>
      {items?.length ? (
        <ul className="flex flex-col gap-2.5">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
              <span className="font-body text-text-mid text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-text-light text-sm">No feedback available yet.</p>
      )}
    </div>
  )
}

export default function InterviewReport() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('sessionId') || getStoredSessionId()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openQ, setOpenQ] = useState(null)

  const scoreBreakdown = useMemo(() => {
    if (!report) return []
    return [
      { label: 'Overall', score: report.scores?.overall ?? report.overallScore },
      { label: 'Technical Depth', score: report.scores?.technical?.score, feedback: report.scores?.technical?.feedback },
      { label: 'Behavioral Clarity', score: report.scores?.hr?.score, feedback: report.scores?.hr?.feedback },
      { label: 'Career Communication', score: report.scores?.general?.score, feedback: report.scores?.general?.feedback },
      { label: 'Confidence Signals', score: report.scores?.confidence },
    ].filter((item) => scoreToPercent(item.score) !== null || item.feedback)
  }, [report])

  const loadReport = async () => {
    if (!sessionId) {
      setError('No interview session was found for this report.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await interviewAPI.getReport(sessionId)
      setReport(data.report)
    } catch (err) {
      setError(err.message || 'Report is not ready yet.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f7ff] via-[#f0f0f0] to-[#f5f3ff] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f7ff] via-[#f0f0f0] to-[#f5f3ff] font-body flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-border-light rounded-2xl p-8 text-center shadow-lg">
          <h1 className="font-heading font-bold text-2xl text-text-dark">Feedback Not Ready</h1>
          <p className="font-body text-text-mid text-sm mt-2">{error || 'Please try again in a moment.'}</p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              onClick={loadReport}
              className="bg-primary text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-shadow"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bg-white border border-border-light text-text-dark font-semibold py-3 rounded-xl hover:border-primary/30 transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const overallScore = (report.overallScore ?? report.scores?.overall) ?? 0
  const questionFeedback = normalizeQuestionFeedback(report.questionFeedback || [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f7ff] via-[#f0f0f0] to-[#f5f3ff] font-body">
      {/* Sticky Header */}
      <div className="bg-white border-b border-border-light px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-text-mid hover:text-primary font-body text-sm transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Interview Report
          </button>
          {report.date && (
            <span className="text-text-light text-xs">
              {new Date(report.date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Hero Section - Score Card */}
        <div className="bg-white border border-border-light rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Circular Score */}
            <div className="flex-shrink-0">
              <div className="relative w-36 h-36">
                <svg width="144" height="144" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="#e8e8f0" strokeWidth="8" />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - overallScore / 100)}`}
                    transform="rotate(-90 56 56)"
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#5358F3" />
                      <stop offset="100%" stopColor="#9F3BDF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="font-heading font-bold text-3xl text-text-dark">{overallScore}</span>
                    <span className="font-body text-text-light text-sm">/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-heading font-bold text-4xl text-text-dark mb-2">
                {titleForScore(overallScore)}
              </h1>
              <p className="font-body text-text-mid text-sm mb-4 flex flex-wrap gap-2 justify-center md:justify-start">
                {report.role && <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{report.role}</span>}
                {report.company && <span className="px-3 py-1 bg-slate-100 text-text-mid rounded-full text-xs">{report.company}</span>}
                {report.durationMinutes && <span className="px-3 py-1 bg-slate-100 text-text-mid rounded-full text-xs">{report.durationMinutes} min</span>}
              </p>
              {report.summary && (
                <p className="font-body text-text-mid text-sm leading-relaxed">
                  {report.summary}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white border border-border-light rounded-3xl p-8 shadow-sm">
          <h2 className="font-heading font-bold text-2xl text-text-dark mb-6">Score Breakdown</h2>
          <div className="flex flex-col gap-5">
            <ScoreBar label="Overall" score={overallScore} />
            <div className="relative mt-2">
              <div className="flex flex-col gap-5" style={{ filter: report.isRestricted ? 'blur(6px)' : 'none', opacity: report.isRestricted ? 0.3 : 1, pointerEvents: report.isRestricted ? 'none' : 'auto', userSelect: report.isRestricted ? 'none' : 'auto' }}>
                {report.isRestricted ? (
                  <>
                    <ScoreBar label="Technical Depth" score={85} feedback="Solid technical grasp." />
                    <ScoreBar label="Behavioral Clarity" score={75} feedback="Clear examples provided." />
                    <ScoreBar label="Career Communication" score={80} feedback="Structured responses." />
                  </>
                ) : (
                  scoreBreakdown.slice(1).map((item) => (
                    <ScoreBar key={item.label} label={item.label} score={item.score} feedback={item.feedback} />
                  ))
                )}
              </div>
              {report.isRestricted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <div className="bg-white/80 backdrop-blur-md border border-white p-6 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mb-3">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <p className="font-heading font-bold text-text-dark text-lg mb-1">Premium Breakdown</p>
                    <p className="font-body text-text-mid text-sm mb-4">Upgrade to Pro for full scoring across all interview dimensions.</p>
                    <button onClick={() => navigate('/pricing')} className="bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-shadow">Upgrade to Pro</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses - Two Column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          <div className="contents" style={{ filter: report.isRestricted ? 'blur(6px)' : 'none', opacity: report.isRestricted ? 0.3 : 1, pointerEvents: report.isRestricted ? 'none' : 'auto', userSelect: report.isRestricted ? 'none' : 'auto' }}>
            <FeedbackList title="Strengths" items={report.isRestricted ? ['Great communication', 'Good attitude'] : report.strengths} tone="good" />
            <FeedbackList title="Areas to Improve" items={report.isRestricted ? ['More technical depth', 'Structured answers'] : report.weaknesses} tone="warn" />
          </div>
        </div>

        {/* Recommendations & Improvement Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          <div className="contents" style={{ filter: report.isRestricted ? 'blur(6px)' : 'none', opacity: report.isRestricted ? 0.3 : 1, pointerEvents: report.isRestricted ? 'none' : 'auto', userSelect: report.isRestricted ? 'none' : 'auto' }}>
            <FeedbackList title="Recommendations" items={report.isRestricted ? ['Read more docs', 'Practice coding'] : report.recommendations} tone="focus" />
            <FeedbackList title="Improvement Plan" items={report.isRestricted ? ['Take a course', 'Do mock interviews'] : report.improvementPlan} tone="focus" />
          </div>
        </div>

        {/* Question-by-Question Feedback */}
        <div className="bg-white border border-border-light rounded-3xl p-8 shadow-sm relative">
          <div style={{ filter: (report.isQuestionFeedbackRestricted || report.isRestricted) ? 'blur(6px)' : 'none', opacity: (report.isQuestionFeedbackRestricted || report.isRestricted) ? 0.3 : 1, pointerEvents: (report.isQuestionFeedbackRestricted || report.isRestricted) ? 'none' : 'auto', userSelect: (report.isQuestionFeedbackRestricted || report.isRestricted) ? 'none' : 'auto' }}>
            <h2 className="font-heading font-bold text-2xl text-text-dark mb-6">
              Question-by-Question Feedback
            </h2>
            {(report.isQuestionFeedbackRestricted || report.isRestricted) ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={`mock-q-${i}`} className="border border-border-light rounded-xl px-5 py-4 flex items-center gap-3">
                    <span className="font-heading font-bold text-sm text-primary bg-primary/10 px-3 py-1 rounded-lg">Q{i}</span>
                    <span className="font-body text-text-mid text-sm flex-1">Mock interview question {i}...</span>
                  </div>
                ))}
              </div>
            ) : questionFeedback.length ? (
              <div className="flex flex-col gap-3">
                {questionFeedback.map((item, index) => (
                  <div key={`question-${index}`} className="border border-border-light rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                    <button
                      type="button"
                      onClick={() => setOpenQ(openQ === index ? null : index)}
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f8f7ff] transition-colors text-left"
                    >
                      <span className="font-heading font-bold text-sm text-primary flex-shrink-0 bg-primary/10 px-3 py-1 rounded-lg">
                        Q{item.questionNumber || index + 1}
                      </span>
                      <span className="font-body text-text-mid text-sm flex-1 min-w-0 line-clamp-2">
                        {item.question || item.label || `Question ${index + 1}`}
                      </span>
                      {item.score !== null && (
                        <span className="font-body font-semibold text-xs flex-shrink-0 px-3 py-1 rounded-lg" style={{ background: `${scoreColor(item.score)}15`, color: scoreColor(item.score) }}>
                          {formatQuestionScore(item.score)}
                        </span>
                      )}
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        viewBox="0 0 24 24"
                        className={`flex-shrink-0 transition-transform duration-200 text-text-light ${openQ === index ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {openQ === index && (
                      <div className="px-5 py-4 bg-[#f8f7ff] border-t border-border-light space-y-4">
                        {/* Granular Scores (if available) */}
                        {(item.answerQualityScore !== null || item.communicationScore !== null || item.technicalDomainScore !== null) && (
                          <div className="flex flex-wrap gap-4 pt-1 pb-2 border-b border-border-light/50">
                            {item.answerQualityScore !== null && (
                              <div className="flex flex-col">
                                <span className="font-body text-text-light text-[11px] uppercase tracking-wider font-semibold">Answer Quality</span>
                                <span className="font-heading font-bold text-lg" style={{ color: scoreColor(item.answerQualityScore) }}>{formatQuestionScore(item.answerQualityScore)}</span>
                              </div>
                            )}
                            {item.communicationScore !== null && (
                              <div className="flex flex-col">
                                <span className="font-body text-text-light text-[11px] uppercase tracking-wider font-semibold">Communication</span>
                                <span className="font-heading font-bold text-lg" style={{ color: scoreColor(item.communicationScore) }}>{formatQuestionScore(item.communicationScore)}</span>
                              </div>
                            )}
                            {item.technicalDomainScore !== null && (
                              <div className="flex flex-col">
                                <span className="font-body text-text-light text-[11px] uppercase tracking-wider font-semibold">Technical/Domain</span>
                                <span className="font-heading font-bold text-lg" style={{ color: scoreColor(item.technicalDomainScore) }}>{formatQuestionScore(item.technicalDomainScore)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Raw Answer */}
                        {(item.answerSummary || item.answer) && (
                          <div>
                            <p className="font-body font-semibold text-text-dark text-xs mb-1">{item.answerSummary ? 'Answer Summary' : 'Your Answer'}</p>
                            <p className="font-body text-text-mid text-sm leading-relaxed">
                              {item.answerSummary || item.answer}
                            </p>
                          </div>
                        )}

                        {/* Strengths & Missing Concepts */}
                        {(item.strengths?.length > 0 || item.missingConcepts?.length > 0) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {item.strengths?.length > 0 && (
                              <div className="bg-green-50/50 p-3 rounded-xl border border-green-100">
                                <p className="font-body font-semibold text-green-800 text-xs mb-2">Strengths</p>
                                <ul className="flex flex-col gap-1.5">
                                  {item.strengths.map((str, i) => (
                                    <li key={i} className="flex items-start gap-2 text-green-700 text-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                      <span className="leading-snug">{str}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {item.missingConcepts?.length > 0 && (
                              <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                                <p className="font-body font-semibold text-red-800 text-xs mb-2">Missing Concepts</p>
                                <ul className="flex flex-col gap-1.5">
                                  {item.missingConcepts.map((mc, i) => (
                                    <li key={i} className="flex items-start gap-2 text-red-700 text-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                                      <span className="leading-snug">{mc}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {item.areasForImprovement?.length > 0 && (
                          <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                            <p className="font-body font-semibold text-orange-800 text-xs mb-2">Areas for Improvement</p>
                            <ul className="flex flex-col gap-1.5">
                              {item.areasForImprovement.map((afi, i) => (
                                <li key={i} className="flex items-start gap-2 text-orange-700 text-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                                  <span className="leading-snug">{afi}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Detailed Texts (Interviewer Expectation, Guidance, Coaching) */}
                        {item.interviewerExpectation && (
                          <div className="pt-2">
                            <p className="font-body font-semibold text-primary text-xs mb-1">Interviewer Expectation</p>
                            <p className="font-body text-text-mid text-sm leading-relaxed bg-white border border-border-light p-3 rounded-xl">
                              {item.interviewerExpectation}
                            </p>
                          </div>
                        )}

                        {item.strongAnswerGuidance && (
                          <div className="pt-2">
                            <p className="font-body font-semibold text-primary text-xs mb-1">Strong Answer Guidance</p>
                            <p className="font-body text-text-mid text-sm leading-relaxed bg-white border border-border-light p-3 rounded-xl">
                              {item.strongAnswerGuidance}
                            </p>
                          </div>
                        )}

                        {item.personalizedCoaching && (
                          <div className="pt-2">
                            <p className="font-body font-semibold text-primary text-xs mb-1">Personalized Coaching</p>
                            <p className="font-body text-text-mid text-sm leading-relaxed bg-white border border-border-light p-3 rounded-xl">
                              {item.personalizedCoaching}
                            </p>
                          </div>
                        )}

                        {/* Legacy Feedback Fallback */}
                        {(!item.interviewerExpectation && !item.personalizedCoaching && !item.strengths?.length) && (
                          <>
                            {item.feedback ? (
                              <div>
                                <p className="font-body font-semibold text-text-dark text-xs mb-1">Feedback</p>
                                <p className="font-body text-text-mid text-sm leading-relaxed">
                                  {item.feedback}
                                </p>
                              </div>
                            ) : (
                              <p className="font-body text-text-light text-sm italic">
                                Specific feedback was not generated for this answer.
                              </p>
                            )}
                            {item.improvement && (
                              <div className="pt-2 border-t border-border-light">
                                <p className="font-body font-semibold text-text-dark text-xs mb-1">How to Improve</p>
                                <p className="font-body text-text-mid text-sm leading-relaxed">
                                  {item.improvement}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-text-light text-sm py-4">Question feedback is not available for this report.</p>
            )}
          </div>
          {(report.isQuestionFeedbackRestricted || report.isRestricted) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="bg-white/80 backdrop-blur-md border border-white p-6 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mb-3">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <p className="font-heading font-bold text-text-dark text-lg mb-1">Unlock AI Intelligence</p>
                <p className="font-body text-text-mid text-sm mb-4">See detailed analysis, scoring, and actionable feedback for every single question.</p>
                <button onClick={() => navigate('/pricing')} className="bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-shadow">Upgrade to Premium for Full Scoring</button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3 pb-4">
          <button
            onClick={() => navigate('/start-interview')}
            className="flex-1 bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-4 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-95"
          >
            Retake Interview
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-white border border-border-light hover:border-primary/30 text-text-dark font-body font-semibold py-4 rounded-2xl transition-all duration-200 hover:shadow-md active:scale-95"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}