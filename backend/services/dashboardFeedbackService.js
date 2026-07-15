const crypto = require('crypto')
const DashboardFeedback = require('../models/DashboardFeedback')

const getProviderConfig = () => {
  if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) {
    return {
      apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
      endpoint: 'https://api.x.ai/v1/chat/completions',
      provider: 'xai',
      model: process.env.XAI_MODEL || process.env.GROK_MODEL || 'grok-4.20-reasoning',
    }
  }

  if (process.env.GEMINI_API_KEY) {
    return {
      apiKey: process.env.GEMINI_API_KEY,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions',
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    }
  }

  return null
}

const compact = value => String(value || '').replace(/\s+/g, ' ').trim()
const clamp = (value, max = 420) => {
  const text = compact(value)
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text
}

const feedbackFingerprint = (reports) => (
  crypto
    .createHash('sha256')
    .update(JSON.stringify(reports.map(report => ({
      id: String(report._id),
      updatedAt: report.updatedAt,
      score: report.overallScore ?? report.scores?.overall,
      level: report.performanceLevel,
    }))))
    .digest('hex')
)

const parseJsonObject = text => {
  try {
    return JSON.parse(text)
  } catch {
    const match = String(text || '').match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

const fallbackFeedback = ({ stats, scoreProgress }) => {
  const scores = scoreProgress.map(item => Number(item.score)).filter(Number.isFinite)
  if (!scores.length) {
    return {
      overallFeedback: 'Complete an interview to unlock personalized performance feedback.',
      recentFeedback: 'No recent scored interview is available yet.',
      source: 'fallback',
    }
  }

  const latest = scores[scores.length - 1]
  const previous = scores[scores.length - 2]
  const growth = Number(stats.improvement || 0)

  return {
    overallFeedback: Number(stats.averageScore || 0) >= 70
      ? 'Your overall interview performance is moving in a healthy direction. Keep using the reports to turn strong answers into a repeatable pattern.'
      : 'Your overall interview performance still needs steadier structure and detail. Focus on improving the weak areas called out in your reports before adding more sessions.',
    recentFeedback: previous === undefined
      ? 'Your latest interview gives you a baseline. Complete one more session to see whether the changes you make are working.'
      : latest >= previous
        ? `Your latest interview improved from the previous one. Keep the same preparation rhythm and use the report feedback to make the next answer set more specific.`
        : `Your latest interview dipped from the previous one. Before the next mock, review the recent report and fix the areas that caused the score to fall.`,
    trend: growth,
    source: 'fallback',
  }
}

const buildPromptPayload = ({ reports, stats, scoreProgress }) => {
  const recentReports = reports.slice(-5).map((report, index) => ({
    session: scoreProgress.length - reports.slice(-5).length + index + 1,
    score: report.overallScore ?? report.scores?.overall ?? null,
    performanceLevel: report.performanceLevel || '',
    role: report.role || '',
    company: report.company || '',
    summary: clamp(report.summary),
    strengths: (report.strengths || []).slice(0, 4).map(item => clamp(item, 160)),
    weaknesses: (report.weaknesses || []).slice(0, 4).map(item => clamp(item, 160)),
    recommendations: (report.recommendations || report.improvementPlan || []).slice(0, 4).map(item => clamp(item, 160)),
  }))

  return {
    stats,
    scoreProgress: scoreProgress.map(item => ({
      session: item.session,
      score: item.score,
      role: item.role,
      date: item.date,
    })),
    recentReports,
  }
}

const callGrok = async (payload) => {
  const config = getProviderConfig()
  if (!config) return null

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You write concise interview coaching feedback for a dashboard. Use only the provided data. Do not invent scores, companies, sessions, or facts. Return valid JSON only.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Write two natural coaching sentences/short paragraphs. overallFeedback should summarize all-time performance. recentFeedback should explain how the latest interview compares to the previous scored interview and what the user should do next. Avoid just reading scores side by side.',
            outputShape: {
              overallFeedback: 'string, 1-2 sentences',
              recentFeedback: 'string, 1-2 sentences',
            },
            data: payload,
          }),
        },
      ],
    }),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result?.error?.message || result?.message || `Grok request failed with status ${response.status}`)
  }

  const content = result?.choices?.[0]?.message?.content
  const parsed = parseJsonObject(content)
  if (!parsed?.overallFeedback || !parsed?.recentFeedback) {
    throw new Error('Grok returned invalid dashboard feedback')
  }

  return {
    overallFeedback: clamp(parsed.overallFeedback, 700),
    recentFeedback: clamp(parsed.recentFeedback, 700),
    provider: config.provider,
    model: config.model,
    source: 'ai',
  }
}

const getDashboardFeedback = async ({ userId, reports, stats, scoreProgress }) => {
  if (!reports.length) return fallbackFeedback({ stats, scoreProgress })

  const fingerprint = feedbackFingerprint(reports)
  const cached = await DashboardFeedback.findOne({ user: userId }).lean()
  if (cached?.fingerprint === fingerprint) {
    return {
      overallFeedback: cached.overallFeedback,
      recentFeedback: cached.recentFeedback,
      provider: cached.provider,
      model: cached.model,
      source: 'cache',
    }
  }

  try {
    const generated = await callGrok(buildPromptPayload({ reports, stats, scoreProgress }))
    if (!generated) return fallbackFeedback({ stats, scoreProgress })

    await DashboardFeedback.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        fingerprint,
        provider: generated.provider,
        model: generated.model,
        overallFeedback: generated.overallFeedback,
        recentFeedback: generated.recentFeedback,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return generated
  } catch (error) {
    console.warn('Dashboard AI feedback failed:', error.message)
    return fallbackFeedback({ stats, scoreProgress })
  }
}

module.exports = {
  getDashboardFeedback,
}
