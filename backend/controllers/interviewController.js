const InterviewSession = require('../models/InterviewSession')
const InterviewReport = require('../models/InterviewReport')
const User = require('../models/User')
const aiService = require('../services/aiService')
const { getDashboardFeedback } = require('../services/dashboardFeedbackService')

const allowedResumeExtensions = new Set(['pdf', 'docx'])
const maxResumeBytes = 5 * 1024 * 1024

const getFileExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase()
const getUserDisplayName = (user) => (
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
)


const parseMinutes = (value) => {
  const parsed = Number.parseInt(value, 10)
  if ([5, 8, 10].includes(parsed)) return parsed
  return 8
}

const normalizeMode = (mode) => {
  if (['technical', 'hr', 'mixed', 'casestudy'].includes(mode)) return mode
  return 'mixed'
}

const toPercentOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null

  const directNumber = Number(value)
  const number = Number.isFinite(directNumber)
    ? directNumber
    : Number(String(value).match(/-?\d+(\.\d+)?/)?.[0])
  if (!Number.isFinite(number)) return null
  if (number > 0 && number < 1) return Math.round(Math.max(0, Math.min(number * 100, 100)))
  if (number >= 1 && number <= 10) return Math.round(Math.max(0, Math.min(number * 10, 100)))
  return Math.round(Math.max(0, Math.min(number, 100)))
}

const toPercent = (value) => toPercentOrNull(value) ?? 0

const storedPercentOrNull = (value) => {
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

const stringifyFeedbackItem = (item) => {
  if (item === null || item === undefined) return ''
  if (typeof item !== 'object') return String(item).trim()
  return String(
    item.text
    || item.feedback
    || item.recommendation
    || item.improvement
    || item.point
    || item.summary
    || JSON.stringify(item)
  ).trim()
}

const compactStrings = (items) => (
  Array.isArray(items)
    ? items.map(stringifyFeedbackItem).filter(Boolean)
    : []
)

const firstPresent = (...values) => (
  values.find((value) => value !== null && value !== undefined && String(value).trim() !== '')
)

const lowInformationScore = 10
const lowEffortAnswerPattern = /\b(idk|i don'?t know|dont know|no idea|not sure|na|n\/a|none|null|test|random|asdf|qwer|zxcv|blah|dummy)\b/i
const negativeEvaluationPattern = /\b(vague|unrelated|irrelevant|incorrect|failed|poor|weak|unclear|not clear|did not|does not|no clear|lacks?|lack of|insufficient|incomplete|unable|inability|needs? improvement|not enough|no specific|no relevant)\b/i

const isLowInformationAnswer = (answer) => {
  const text = String(answer || '').trim()
  if (!text) return true

  const words = text.toLowerCase().match(/[a-z0-9]+/g) || []
  const letters = text.toLowerCase().replace(/[^a-z]/g, '')
  const longestToken = words.reduce((longest, word) => Math.max(longest, word.length), 0)

  if (!letters.length) return true
  if (lowEffortAnswerPattern.test(text)) return true
  if (/^(.)\1{4,}$/.test(letters)) return true

  // Interview answers need at least a little substance. One/two token answers,
  // including keyboard-smash strings, should never receive strong scores.
  if (words.length <= 2 && text.length < 30) return true
  if (words.length === 1 && longestToken >= 12) return true

  return false
}

const averageScore = (scores) => {
  const validScores = scores.filter((score) => Number.isFinite(score))
  if (!validScores.length) return null
  return Math.round(validScores.reduce((total, score) => total + score, 0) / validScores.length)
}

const hasNegativeEvaluation = (...values) => (
  values.some((value) => negativeEvaluationPattern.test(String(value || '')))
)

const capScore = (score, maxScore) => (
  score === null || score === undefined ? maxScore : Math.min(score, maxScore)
)

const sectionScore = (sections, sectionName) => {
  const section = sections?.[sectionName]
  const score = toPercentOrNull(section?.average_score)
  return {
    score: hasNegativeEvaluation(section?.feedback) && score !== null
      ? capScore(score, 20)
      : score,
    feedback: section?.feedback || '',
  }
}

const normalizeQuestionFeedbackItem = (item, index, session) => {
  const source = item && typeof item === 'object' && !Array.isArray(item)
    ? item
    : { feedback: item }
  const transcriptTurn = session.transcript?.[index] || {}
  const questionNumber = Number(firstPresent(
    source.questionNumber,
    source.question_number,
    source.questionNo,
    source.question_no,
    source.number,
    transcriptTurn.questionNumber,
    index + 1
  ))
  const score = toPercentOrNull(firstPresent(
    source.score,
    source.average_score,
    source.averageScore,
    source.rating
  ))
  const feedback = firstPresent(
    source.feedback,
    source.comment,
    source.assessment,
    source.evaluation
  )
  const improvement = firstPresent(
    source.improvement,
    source.recommendation,
    source.suggestion,
    source.next_step,
    source.nextStep
  )
  const answer = String(firstPresent(source.answer, source.candidate_answer, source.candidateAnswer, transcriptTurn.answer, ''))
  const lowInformation = isLowInformationAnswer(answer)
  const negativeEvaluation = hasNegativeEvaluation(
    source.answerSummary,
    source.answer_summary,
    source.summary,
    feedback,
    improvement
  )
  const normalized = {
    questionNumber: Number.isFinite(questionNumber) ? questionNumber : index + 1,
    question: String(firstPresent(source.question, source.prompt, source.label, transcriptTurn.question, `Question ${index + 1}`)),
    answer,
    answerSummary: String(firstPresent(source.answerSummary, source.answer_summary, source.summary, '')),
    feedback: String(feedback || ''),
    improvement: String(improvement || ''),
    section: String(firstPresent(source.section, source.type, '')),
    answerQualityScore: toPercentOrNull(source.answer_quality_score ?? source.answerQualityScore),
    communicationScore: toPercentOrNull(source.communication_score ?? source.communicationScore),
    technicalDomainScore: toPercentOrNull(source.technical_domain_score ?? source.technicalDomainScore),
    strengths: compactStrings(source.strengths),
    areasForImprovement: compactStrings(firstPresent(source.areas_for_improvement, source.areasForImprovement)),
    missingConcepts: compactStrings(firstPresent(source.missing_concepts, source.missingConcepts)),
    interviewerExpectation: String(firstPresent(source.interviewer_expectation, source.interviewerExpectation, '')),
    strongAnswerGuidance: String(firstPresent(source.strong_answer_guidance, source.strongAnswerGuidance, '')),
    personalizedCoaching: String(firstPresent(source.personalized_coaching, source.personalizedCoaching, '')),
    lowInformation,
    negativeEvaluation,
  }

  if (score !== null) normalized.score = score

  if (lowInformation) {
    normalized.score = capScore(normalized.score, lowInformationScore)
    normalized.feedback = 'This answer did not provide enough relevant information to evaluate the question.'
    normalized.improvement = 'Give a direct answer with specific details, examples, and reasoning from your experience.'
  } else if (negativeEvaluation) {
    normalized.score = capScore(normalized.score, 20)
  }

  return normalized
}

const detailedFeedbackLooksQuestionBased = (detailed) => (
  Object.entries(detailed).some(([label, value]) => (
    /q(uestion)?\s*\d+/i.test(label)
    || /^\d+$/.test(String(label).trim())
    || (value && typeof value === 'object' && (
      value.question
      || value.question_number
      || value.questionNumber
      || value.score
    ))
  ))
)

const buildQuestionFeedback = (rawReport, session) => {
  const explicitFeedback = (
    Array.isArray(rawReport?.question_feedback) && rawReport.question_feedback
  ) || (
    Array.isArray(rawReport?.questionFeedback) && rawReport.questionFeedback
  ) || (
    Array.isArray(rawReport?.questions) && rawReport.questions
  )

  if (explicitFeedback) {
    return explicitFeedback.map((item, index) => normalizeQuestionFeedbackItem(item, index, session))
  }

  const detailed = rawReport?.detailed_feedback || rawReport?.detailedFeedback
  if (detailed && typeof detailed === 'object' && !Array.isArray(detailed) && detailedFeedbackLooksQuestionBased(detailed)) {
    return Object.entries(detailed).map(([label, feedback]) => ({
      ...normalizeQuestionFeedbackItem(
        typeof feedback === 'object' && feedback !== null ? { label, ...feedback } : { label, feedback },
        Number.parseInt(label.match(/\d+/)?.[0], 10) - 1 || 0,
        session
      ),
    }))
  }

  return session.transcript.map((turn) => ({
    questionNumber: turn.questionNumber,
    question: turn.question,
    answer: turn.answer,
    feedback: '',
  }))
}

const buildImprovementPlan = (weaknesses, recommendations) => {
  if (recommendations.length) return recommendations.slice(0, 5)

  if (weaknesses.length) {
    return weaknesses.slice(0, 5).map((item) => `Practice a stronger example for: ${item}`)
  }

  return [
    'Retake this role once after revising your resume stories.',
    'Use the STAR structure for behavioral answers.',
    'Add one concrete metric or technical tradeoff to each project answer.',
  ]
}

const buildRecommendations = (weaknesses, recommendations) => {
  if (recommendations.length) return recommendations

  if (weaknesses.length) {
    return weaknesses.slice(0, 4).map((item) => `Turn "${item}" into a prepared story with context, action, result, and one measurable detail.`)
  }

  return [
    'Practice concise two-minute answers for your most important resume projects.',
    'Add concrete metrics, tradeoffs, and outcomes when explaining technical work.',
    'Run another mock interview after revising the answers that felt least confident.',
  ]
}

const buildCoachingReport = (rawReport, session) => {
  const report = rawReport && typeof rawReport === 'object' ? rawReport : {}
  const overall = report.overall_performance || {}
  const sections = report.section_wise_evaluation || {}
  const strengths = compactStrings(report.strengths)
  const weaknesses = compactStrings(report.weaknesses || report.areas_to_improve)
  const recommendations = buildRecommendations(weaknesses, compactStrings(report.recommendations))
  const summary = overall.summary || report.summary || (typeof rawReport === 'string' ? rawReport : '')
  const questionFeedback = buildQuestionFeedback(report, session)
  const rawOverallScore = toPercent(overall.average_score ?? report.overall_score ?? report.average_score)
  const questionAverageScore = averageScore(questionFeedback.map((item) => item.score))
  const overallScore = questionAverageScore ?? rawOverallScore
  const allAnswersLowInformation = Boolean(questionFeedback.length)
    && questionFeedback.every((item) => item.lowInformation)
  const guardedSectionScore = (sectionName) => {
    const section = sectionScore(sections, sectionName)
    return allAnswersLowInformation && section.score !== null
      ? { ...section, score: Math.min(section.score, lowInformationScore) }
      : section
  }

  return {
    user: session.user,
    userPlanAtStart: session.userPlanAtStart || 'free',
    session: session._id,
    aiInterviewId: session.aiInterviewId,
    role: session.role,
    company: session.company,
    mode: session.mode,
    durationMinutes: session.durationMinutes,
    overallScore,
    performanceLevel: overall.performance_level || report.performance_level || '',
    summary,
    scores: {
      overall: overallScore,
      technical: guardedSectionScore('Technical'),
      hr: guardedSectionScore('HR'),
      general: guardedSectionScore('General'),
      confidence: toPercentOrNull(report.face_analysis?.confidence_score),
    },
    strengths,
    weaknesses,
    recommendations,
    improvementPlan: buildImprovementPlan(weaknesses, recommendations),
    questionFeedback,
    rawReport,
  }
}

const legacyQuestionFeedbackText = 'Review this answer for structure, specificity, and examples before your next practice round.'

const reportNeedsNormalization = (report, session) => {
  if (!report?.rawReport || !Array.isArray(report?.questionFeedback)) return false

  const hasLegacyFeedback = report.questionFeedback.some((item) => item?.feedback === legacyQuestionFeedbackText)
  const hasLowInformationScore = (session.transcript || []).some((turn, index) => {
    const score = storedPercentOrNull(report.questionFeedback[index]?.score)
    return isLowInformationAnswer(turn.answer) && (score === null || score > lowInformationScore)
  })
  const hasContradictoryQuestionScore = report.questionFeedback.some((item) => {
    const score = storedPercentOrNull(item?.score)
    return hasNegativeEvaluation(
      item?.answerSummary,
      item?.answer_summary,
      item?.summary,
      item?.feedback,
      item?.comment,
      item?.improvement,
      item?.recommendation
    ) && (score === null || score > 20)
  })

  return hasLegacyFeedback || hasLowInformationScore || hasContradictoryQuestionScore
}

const saveReportForSession = async (session, rawReport) => {
  const coachingReport = buildCoachingReport(rawReport, session)

  return InterviewReport.findOneAndUpdate(
    { session: session._id, user: session.user },
    coachingReport,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
}

const getOwnedSession = async (sessionId, userId) => {
  const session = await InterviewSession.findOne({ _id: sessionId, user: userId })
  if (!session) {
    const error = new Error('Interview session not found')
    error.statusCode = 404
    throw error
  }
  return session
}

const sendError = (res, error, fallback = 'Interview request failed') => {
  const statusCode = error.statusCode || 500
  const message = error.message === 'fetch failed'
    ? 'AI service is not reachable. Please start the AI backend on port 8000 and try again.'
    : (error.message || fallback)

  res.status(statusCode).json({
    success: false,
    message,
  })
}

const scoreValue = (report) => storedPercentOrNull(report?.overallScore ?? report?.scores?.overall) ?? 0

const domainSectionName = {
  technical: 'Technical',
  hr: 'HR',
  general: 'General',
}

const domainScoreValue = (report, domain) => {
  const rawSections = report?.rawReport?.section_wise_evaluation || {}
  const sectionName = domainSectionName[domain] || domain

  return storedPercentOrNull(
    report?.scores?.[domain]?.score
    ?? report?.scores?.[domain]
    ?? rawSections[sectionName]?.average_score
    ?? rawSections[domain]?.average_score
  ) ?? null
}

const scoreColor = (score) => {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#5B4FF5'
  return '#f97316'
}

const statusColor = (status) => {
  if (status === 'abandoned' || status === 'failed') return '#ef4444'
  return '#8888aa'
}

const cleanFeedbackLabel = (value) => (
  String(value || '')
    .replace(/^[\s\-\u2022]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.\u3002]+$/, '')
    .trim()
)

const buildAreasToImprove = (reports) => {
  const counts = new Map()

  reports.slice().reverse().forEach((report) => {
    compactStrings(report.weaknesses).forEach((item) => {
      const label = cleanFeedbackLabel(item)
      if (!label) return
      counts.set(label, (counts.get(label) || 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label)
}

const buildDashboardInsights = (reports, sessionById) => {
  const latestReport = reports[reports.length - 1]
  if (!latestReport) {
    return {
      lastUpdated: new Date().toISOString(),
      latestReport: null,
      recommendation: null,
      proctoring: null,
      nextFocus: '',
      weakestQuestion: null,
    }
  }

  const raw = latestReport.rawReport && typeof latestReport.rawReport === 'object'
    ? latestReport.rawReport
    : {}
  const face = raw.face_analysis || {}
  const finalRecommendation = raw.final_recommendation || {}
  const cheatingSummary = face.cheating_summary || {}
  const session = sessionById.get(String(latestReport.session))
  const questionFeedback = Array.isArray(latestReport.questionFeedback)
    ? latestReport.questionFeedback
    : []
  const weakestQuestion = questionFeedback
    .filter((item) => storedPercentOrNull(item?.score) !== null)
    .sort((a, b) => storedPercentOrNull(a.score) - storedPercentOrNull(b.score))[0]

  return {
    lastUpdated: new Date().toISOString(),
    latestReport: {
      sessionId: latestReport.session,
      reportId: latestReport._id,
      role: latestReport.role,
      company: latestReport.company,
      mode: latestReport.mode,
      score: scoreValue(latestReport),
      performanceLevel: latestReport.performanceLevel || '',
      summary: latestReport.summary || raw.overall_performance?.summary || '',
      completedAt: (session?.completedAt || latestReport.updatedAt || latestReport.createdAt)?.toISOString?.() || null,
    },
    recommendation: {
      decision: finalRecommendation.decision || '',
      justification: finalRecommendation.justification || '',
    },
    proctoring: {
      confidenceScore: toPercentOrNull(face.confidence_score),
      dominantEmotion: face.dominant_emotion || '',
      lastEmotion: face.last_emotion || '',
      verificationRate: toPercentOrNull(face.verification_rate),
      verificationStatus: face.verification_status || '',
      totalFrames: Number(face.total_frames || 0),
      behaviorAssessment: face.behavior_assessment || '',
      status: cheatingSummary.status || '',
      severity: cheatingSummary.severity || face.proctoring_severity || '',
      primaryReason: cheatingSummary.primary_reason || '',
      cheatingEvents: Number(cheatingSummary.cheating_events || 0),
    },
    nextFocus: latestReport.improvementPlan?.[0] || latestReport.recommendations?.[0] || latestReport.weaknesses?.[0] || '',
    weakestQuestion: weakestQuestion ? {
      questionNumber: weakestQuestion.questionNumber,
      question: weakestQuestion.question,
      score: storedPercentOrNull(weakestQuestion.score),
      improvement: weakestQuestion.improvement || weakestQuestion.feedback || '',
    } : null,
  }
}

const abandonDashboardActiveSessions = async (userId) => {
  await InterviewSession.updateMany(
    { user: userId, status: 'active' },
    {
      $set: {
        status: 'abandoned',
        abandonedAt: new Date(),
        currentQuestion: '',
        lastError: 'Interrupted interview closed from dashboard',
      },
    }
  )
}

const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id
    await abandonDashboardActiveSessions(userId)

    const [sessions, reports] = await Promise.all([
      InterviewSession.find({ user: userId }).sort({ createdAt: -1 }).lean(),
      InterviewReport.find({ user: userId }).sort({ createdAt: 1 }).lean(),
    ])

    const reportBySession = new Map(
      reports.map((report) => [String(report.session), report])
    )
    const sessionById = new Map(
      sessions.map((session) => [String(session._id), session])
    )
    const reportScores = reports.map(scoreValue).filter((score) => Number.isFinite(score))
    const averageScore = reportScores.length
      ? Math.round(reportScores.reduce((total, score) => total + score, 0) / reportScores.length)
      : 0
    const bestScore = reportScores.length ? Math.max(...reportScores) : 0
    const improvement = reportScores.length >= 2
      ? reportScores[reportScores.length - 1] - reportScores[0]
      : 0
    const completedSessions = sessions.filter((session) => session.status === 'completed').length

    const scoreProgress = reports.map((report, index) => {
      const session = sessionById.get(String(report.session))

      return {
        session: index + 1,
        score: scoreValue(report),
        technical: domainScoreValue(report, 'technical'),
        hr: domainScoreValue(report, 'hr'),
        general: domainScoreValue(report, 'general'),
        role: report.role,
        company: report.company || session?.company || '',
        date: (session?.completedAt || session?.abandonedAt || report.createdAt || report.updatedAt)?.toISOString?.(),
      }
    })
    const dashboardFeedback = await getDashboardFeedback({
      userId,
      reports,
      stats: {
        averageScore,
        bestScore,
        totalSessions: sessions.length,
        completedSessions,
        improvement,
      },
      scoreProgress,
    })

    const interviewHistory = sessions.slice(0, 30).map((session) => {
      const report = reportBySession.get(String(session._id))
      const score = report ? scoreValue(report) : null
      const date = session.completedAt || session.abandonedAt || session.updatedAt || session.createdAt

      return {
        sessionId: session._id,
        reportId: report?._id || null,
        role: session.role,
        company: session.company,
        mode: session.mode,
        status: report ? 'completed' : session.status,
        performanceLevel: report?.performanceLevel || '',
        score,
        color: score === null ? statusColor(session.status) : scoreColor(score),
        date: date?.toISOString?.() || null,
        reportReady: Boolean(report),
      }
    })

    res.json({
      success: true,
      dashboard: {
        user: {
          id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          plan: req.user.plan,
          interviewCredits: req.user.interviewCredits,
          onboardingCompleted: req.user.onboardingCompleted,
          onboardingData: req.user.onboardingData,
        },
        stats: {
          averageScore,
          bestScore,
          totalSessions: sessions.length,
          completedSessions,
          improvement,
        },
        scoreProgress,
        achievements: [
          { id: 'first-interview', icon: '1', label: 'First Interview', unlocked: sessions.length > 0 },
          { id: 'score-80', icon: '80', label: '80+ Score', unlocked: bestScore >= 80 },
          { id: 'five-sessions', icon: '5', label: '5 Sessions', unlocked: completedSessions >= 5 },
          { id: 'score-90', icon: '90', label: '90+ Score', unlocked: bestScore >= 90 },
          { id: 'ten-sessions', icon: '10', label: '10 Sessions', unlocked: sessions.length >= 10 },
          { id: 'perfect-score', icon: '100', label: 'Perfect 100', unlocked: bestScore >= 100 },
        ],
        areasToImprove: buildAreasToImprove(reports),
        insights: {
          ...buildDashboardInsights(reports, sessionById),
          dashboardFeedback,
        },
        interviewHistory,
      },
    })
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    sendError(res, error, 'Could not load dashboard')
  }
}

const uploadResume = async (req, res) => {
  const name = getUserDisplayName(req.user)
  const email = req.user?.email

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'User name/email missing' })
  }

  // Validate Content-Type is multipart before proxying
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ success: false, message: 'Resume must be sent as multipart/form-data' })
  }

  try {
    const result = await aiService.uploadResume({
      stream: req,
      contentType,
      name,
      email,
    })

    res.status(201).json({
      success: true,
      candidateId: result.candidate_id,
      resumeId: result.resume_id,
      raw: result,
    })
  } catch (error) {
    console.error('AI resume upload error:', error)
    sendError(res, error, 'Resume upload failed')
  }
}

const scanResumeFace = async (req, res) => {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ success: false, message: 'Resume must be sent as multipart/form-data' })
  }

  try {
    const result = await aiService.scanResumeFace({
      stream: req,
      contentType,
    })
    res.status(200).json(result)
  } catch (error) {
    console.error('AI resume scan face error:', error)
    sendError(res, error, 'Resume scan failed')
  }
}

const uploadFaceVector = async (req, res) => {
  const { resumeId } = req.params;
  const { candidateImageVector } = req.body;
  
  if (!resumeId || !candidateImageVector) {
    return res.status(400).json({ success: false, message: 'resumeId and candidateImageVector are required' });
  }

  try {
    const result = await aiService.updateFaceVector(resumeId, candidateImageVector);
    res.status(200).json(result);
  } catch (error) {
    console.error('AI face vector upload error:', error);
    sendError(res, error, 'Failed to update face vector');
  }
}

const startInterview = async (req, res) => {
  try {
    const { candidateId, resumeId, role, company, mode, durationMinutes, resumeFile } = req.body
    const normalizedRole = String(role || '').trim()
    const normalizedMode = normalizeMode(mode)
    const minutes = parseMinutes(durationMinutes)

    if (!candidateId || !resumeId || !normalizedRole) {
      return res.status(400).json({ success: false, message: 'Resume, candidate, and role are required' })
    }

    // 1. Gating check: Domain limit for Free users
    if (req.user.plan === 'free' && normalizedMode !== 'technical') {
      return res.status(403).json({
        success: false,
        message: 'Free plan only supports the Technical domain. Upgrade to Pro for full access.',
        upgradeRequired: true
      })
    }

    // 2. Gating check: Custom role limit for Free & Pro users
    const PREDEFINED_ROLES = [
      'Software Engineer',
      'Frontend Engineer',
      'Backend Engineer',
      'Fullstack Engineer',
      'Data Scientist',
      'Product Manager'
    ]
    const isPredefinedRole = (roleStr) => PREDEFINED_ROLES.some(r => r.toLowerCase() === roleStr.trim().toLowerCase())
    if ((req.user.plan === 'free' || req.user.plan === 'pro') && !isPredefinedRole(normalizedRole)) {
      return res.status(403).json({
        success: false,
        message: 'Custom role targeting requires Premium. Choose a predefined role or upgrade.',
        upgradeRequired: true
      })
    }

    // 3. Tracking, reset, and limit check for ALL plans
    const now = new Date()
    if (!req.user.billingCycleStart) {
      req.user.billingCycleStart = now
      req.user.monthlyInterviewsCount = 0
      if (req.user.plan === 'pro') {
        req.user.interviewCredits = parseInt(process.env.PRO_PLAN_CREDITS) || 15
      } else if (req.user.plan === 'premium') {
        req.user.interviewCredits = parseInt(process.env.PREMIUM_PLAN_CREDITS) || 30
      } else {
        req.user.interviewCredits = parseInt(process.env.FREE_PLAN_CREDITS) || 2
      }
      await req.user.save()
    } else {
      const oneMonthLater = new Date(req.user.billingCycleStart)
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
      if (now >= oneMonthLater) {
        req.user.monthlyInterviewsCount = 0
        if (req.user.plan === 'pro') {
          req.user.interviewCredits = parseInt(process.env.PRO_PLAN_CREDITS) || 15
        } else if (req.user.plan === 'premium') {
          req.user.interviewCredits = parseInt(process.env.PREMIUM_PLAN_CREDITS) || 30
        } else {
          req.user.interviewCredits = parseInt(process.env.FREE_PLAN_CREDITS) || 2
        }
        req.user.billingCycleStart = now
        await req.user.save()
      }
    }

    // Atomic update to increment monthly count and decrement credits
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        interviewCredits: { $gt: 0 }
      },
      {
        $inc: { monthlyInterviewsCount: 1, interviewCredits: -1 }
      },
      { new: true }
    )

    if (!updatedUser) {
      return res.status(403).json({
        success: false,
        message: req.user.plan === 'free' ? 'Limit Reached: Upgrade to Pro' : 'Monthly credit limit reached.',
        limitReached: true,
        upgradeRequired: req.user.plan === 'free'
      })
    }

    req.user.monthlyInterviewsCount = updatedUser.monthlyInterviewsCount
    req.user.interviewCredits = updatedUser.interviewCredits

    const campaignId = `mockprep-${req.user._id}-${Date.now()}`
    const aiRole = [
      normalizedRole,
      normalizedMode !== 'mixed' ? `${normalizedMode} practice` : 'mixed practice',
      company ? `target company: ${company}` : '',
      `${minutes} questions student coaching session`,
    ].filter(Boolean).join(' | ')

    const aiStart = await aiService.startInterview({
      candidateId,
      resumeId,
      campaignId,
      role: aiRole,
      totalQuestions: minutes,
    })

    const questionNumber = aiStart.question_no || aiStart.question_index || 1
    const totalQuestions = aiStart.total_questions || minutes
    const firstQuestion = aiStart.question || aiStart.first_question || ''

    const session = await InterviewSession.create({
      user: req.user._id,
      userPlanAtStart: req.user.plan,
      aiInterviewId: aiStart.interview_id,
      candidateId,
      resumeId,
      campaignId,
      role: normalizedRole,
      company: String(company || '').trim(),
      mode: normalizedMode,
      durationMinutes: minutes,
      questionNumber,
      totalQuestions,
      currentQuestion: firstQuestion,
      firstQuestion,
      resumeFile: {
        name: resumeFile?.name || '',
        mimeType: resumeFile?.mimeType || '',
        size: resumeFile?.size || 0,
      },
      lastAiResponse: aiStart,
    })

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        interviewId: session.aiInterviewId,
        firstQuestion: session.firstQuestion,
        questionNumber: session.questionNumber,
        totalQuestions: session.totalQuestions,
        role: session.role,
        company: session.company,
        mode: session.mode,
        durationMinutes: session.durationMinutes,
      },
      user: {
        interviewCredits: req.user.interviewCredits,
      },
    })
  } catch (error) {
    try {
      await User.updateOne(
        { _id: req.user._id },
        { $inc: { monthlyInterviewsCount: -1, interviewCredits: 1 } }
      )
    } catch (err) {
      console.error('Rollback of user limit count failed:', err)
    }
    console.error('AI start interview error:', error)
    sendError(res, error, 'Could not start interview')
  }
}

const getSession = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    res.json({ success: true, session })
  } catch (error) {
    sendError(res, error)
  }
}

const abandonSession = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)

    if (session.status === 'completed') {
      return res.json({
        success: true,
        session: {
          id: session._id,
          status: session.status,
          completedAt: session.completedAt,
        },
      })
    }

    if (session.status === 'active') {
      session.status = 'abandoned'
      session.abandonedAt = new Date()
      session.currentQuestion = ''
      session.lastError = 'User exited interview before completion'
      await session.save()

      try {
        await aiService.abandonInterview(session.aiInterviewId)
      } catch (aiError) {
        console.warn('AI abandon cleanup failed:', aiError.message)
      }
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        status: session.status,
        abandonedAt: session.abandonedAt,
      },
    })
  } catch (error) {
    console.error('Interview abandon error:', error)
    sendError(res, error, 'Could not exit interview')
  }
}

const submitAnswer = async (req, res) => {
  try {
    const body = req.body || {}
    const rawAnswer = (
      body.answer
      ?? body.text
      ?? body.transcript
      ?? body.manualAnswer
      ?? body.manual_answer
      ?? ''
    )
    const cleanedAnswer = String(rawAnswer).trim()

    if (!cleanedAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Answer is required',
        code: 'ANSWER_REQUIRED',
        bodyKeys: Object.keys(body),
      })
    }

    let session = await getOwnedSession(req.params.sessionId, req.user._id)
    if (session.status !== 'active') {
      if (session.status === 'completed') {
        return res.json({
          success: true,
          stop: true,
          message: 'Interview already completed',
        })
      }

      return res.status(409).json({
        success: false,
        message: `Interview session is ${session.status}`,
        session: {
          id: session._id,
          status: session.status,
          abandonedAt: session.abandonedAt,
          completedAt: session.completedAt,
        },
      })
    }

    const aiResponse = await aiService.submitAnswer({
      interviewId: session.aiInterviewId,
      answer: cleanedAnswer,
    })

    session = await getOwnedSession(req.params.sessionId, req.user._id)
    if (session.status !== 'active') {
      return res.status(409).json({
        success: false,
        message: 'Interview session is no longer active',
        session: {
          id: session._id,
          status: session.status,
          abandonedAt: session.abandonedAt,
          completedAt: session.completedAt,
        },
      })
    }

    session.transcript.push({
      questionNumber: session.questionNumber,
      question: session.currentQuestion,
      answer: cleanedAnswer,
    })
    session.lastAiResponse = aiResponse

    if (aiResponse.stop === true || !aiResponse.next_question) {
      session.status = 'completed'
      session.completedAt = new Date()
      session.currentQuestion = ''
      await session.save()

      let report = null
      let reportPending = false

      try {
        const rawReport = await aiService.fetchReport(session.aiInterviewId)
        report = await saveReportForSession(session, rawReport)
      } catch (reportError) {
        reportPending = true
        session.lastError = reportError.message
        await session.save()
        console.warn('Report fetch after completion failed:', reportError.message)
      }

      return res.json({
        success: true,
        stop: true,
        message: 'Interview completed',
        reportPending,
        reportId: report?._id,
      })
    }

    const nextQuestionNumber = aiResponse.question_no || aiResponse.question_index || (session.questionNumber + 1)
    const totalQuestions = aiResponse.total_questions || session.totalQuestions

    session.questionNumber = nextQuestionNumber
    session.totalQuestions = totalQuestions
    session.currentQuestion = aiResponse.next_question
    await session.save()

    res.json({
      success: true,
      stop: false,
      nextQuestion: session.currentQuestion,
      questionNumber: session.questionNumber,
      totalQuestions: session.totalQuestions,
    })
  } catch (error) {
    console.error('AI answer submit error:', error)
    sendError(res, error, 'Could not submit answer')
  }
}

const getReport = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    let report = await InterviewReport.findOne({ session: session._id, user: req.user._id })

    if (!report && session.status === 'completed') {
      const rawReport = await aiService.fetchReport(session.aiInterviewId)
      report = await saveReportForSession(session, rawReport)
    }

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report is not ready yet' })
    }

    if (reportNeedsNormalization(report, session)) {
      Object.assign(report, buildCoachingReport(report.rawReport, session))
      await report.save()
    }

    // Gating check: use user's CURRENT plan to decide access
    let responseReport = report.toObject()

    const currentPlan = req.user.plan
    if (currentPlan === 'pro') {
      responseReport.isRestricted = false
      responseReport.isQuestionFeedbackRestricted = true

      if (Array.isArray(responseReport.questionFeedback)) {
        responseReport.questionFeedback = responseReport.questionFeedback.map(q => ({
          questionNumber: q.questionNumber,
          question: q.question,
          answer: q.answer,
          // Clear gated details
          feedback: '',
          improvement: '',
          answerSummary: '',
          score: null,
        }))
      }

      // Redact full AI json payload which contains resume analysis & scoring details
      delete responseReport.rawReport
    }

    res.json({ success: true, report: responseReport })
  } catch (error) {
    console.error('Report fetch error:', error)
    sendError(res, error, 'Could not fetch report')
  }
}

const getPregeneratedTts = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    const audio = await aiService.getPregeneratedTts({
      interviewId: session.aiInterviewId,
      text: req.body.text,
      questionNo: req.body.questionNo || req.body.question_no || session.questionNumber,
      maxWaitMs: req.body.maxWaitMs || req.body.max_wait_ms || 500,
    })

    res.setHeader('Content-Type', audio.contentType)
    res.send(audio.buffer)
  } catch (error) {
    console.error('TTS pregenerated error:', error)
    sendError(res, error, 'Could not load question audio')
  }
}

const generateInterviewTts = async (req, res) => {
  try {
    await getOwnedSession(req.params.sessionId, req.user._id)
    const audio = await aiService.generateInterviewTts({ text: req.body.text })

    res.setHeader('Content-Type', audio.contentType)
    res.send(audio.buffer)
  } catch (error) {
    console.error('TTS generation error:', error)
    sendError(res, error, 'Could not generate question audio')
  }
}

const uploadFaceFrame = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    const result = await aiService.uploadFaceFrame({
      interviewId: session.aiInterviewId,
      vector: req.body.vector,
      cheating_details: req.body.cheating_details,
    })

    res.json({ success: true, result })
  } catch (error) {
    console.error('Face frame upload error:', error)
    sendError(res, error, 'Could not upload face frame')
  }
}

const checkExistingResume = async (req, res) => {
  try {
    const email = req.user?.email
    if (!email) {
      return res.status(400).json({ success: false, message: 'User email missing' })
    }
    const result = await aiService.checkExistingResume(email)
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('Check existing resume error:', error)
    sendError(res, error, 'Could not check existing resume')
  }
}

module.exports = {
  getDashboard,
  uploadResume,
  scanResumeFace,
  uploadFaceVector,
  startInterview,
  getSession,
  abandonSession,
  submitAnswer,
  getReport,
  getPregeneratedTts,
  generateInterviewTts,
  uploadFaceFrame,
  checkExistingResume,
}
