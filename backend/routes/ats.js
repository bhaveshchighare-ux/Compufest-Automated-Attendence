const express = require('express')
const router = express.Router()

router.post('/analyze', (req, res) => {
  const { resume, jobDescription } = req.body

  if (!resume || !jobDescription) {
    return res.status(400).json({ message: 'Resume and job description are required' })
  }

  // Extract words from text
  const extractKeywords = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  }

  const resumeWords = new Set(extractKeywords(resume))
  const jobWords = extractKeywords(jobDescription)

  // Find unique important job keywords
  const commonWords = new Set(['that', 'with', 'this', 'have', 'from', 'they', 'will', 'your', 'been', 'more', 'when', 'also', 'into', 'than', 'then', 'some', 'what', 'which', 'their', 'about', 'would', 'other', 'these', 'work', 'able', 'well'])

  const jobKeywords = [...new Set(jobWords)].filter(w => !commonWords.has(w)).slice(0, 30)

  const matched = jobKeywords.filter(w => resumeWords.has(w))
  const missing = jobKeywords.filter(w => !resumeWords.has(w))

  const keywordMatch = Math.round((matched.length / jobKeywords.length) * 100)

  // Format score based on resume length and structure
  const hasEmail = /\S+@\S+/.test(resume)
  const hasPhone = /[\d]{10}|[\d\-\(\)\s]{12,}/.test(resume)
  const hasSections = /(experience|education|skills|projects|summary)/i.test(resume)
  const formatScore = Math.min(100, 40 + (hasEmail ? 20 : 0) + (hasPhone ? 20 : 0) + (hasSections ? 20 : 0))

  // Relevance score
  const resumeWordCount = resume.split(/\s+/).length
  const relevanceScore = Math.min(100, Math.round(keywordMatch * 0.7 + (resumeWordCount > 200 ? 30 : 10)))

  // Overall
  const overallScore = Math.round((keywordMatch * 0.5) + (formatScore * 0.25) + (relevanceScore * 0.25))

  // Strengths
  const strengths = []
  if (keywordMatch >= 60) strengths.push('Good keyword alignment with the job description')
  if (hasEmail && hasPhone) strengths.push('Contact information is clearly present')
  if (hasSections) strengths.push('Resume has clear structured sections')
  if (resumeWordCount > 300) strengths.push('Resume has sufficient detail and content')
  if (strengths.length < 3) strengths.push('Resume submitted in a readable format')
  if (strengths.length < 3) strengths.push('Some relevant experience detected')

  // Improvements
  const improvements = []
  if (keywordMatch < 60) improvements.push('Add more keywords from the job description to your resume')
  if (!hasSections) improvements.push('Add clear sections: Skills, Experience, Education')
  if (!hasEmail) improvements.push('Make sure your email address is included')
  if (missing.length > 0) improvements.push(`Include these missing keywords: ${missing.slice(0, 5).join(', ')}`)
  if (resumeWordCount < 200) improvements.push('Expand your resume with more detail about your experience')
  if (improvements.length < 3) improvements.push('Tailor your resume specifically for each job application')

  res.json({
    overallScore,
    keywordMatch,
    formatScore,
    relevanceScore,
    matchedKeywords: matched.slice(0, 15),
    missingKeywords: missing.slice(0, 15),
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    summary: `Your resume matches ${keywordMatch}% of the job keywords with an overall ATS score of ${overallScore}/100.`
  })
})

module.exports = router