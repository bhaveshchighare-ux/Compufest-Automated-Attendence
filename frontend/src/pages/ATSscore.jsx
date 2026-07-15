import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BASE_URL, getAuthHeaders } from '../lib/api'

const scoreColor = (score) => {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#5B4FF5'
  return '#f97316'
}

function ScoreBar({ label, score, feedback }) {
  return (
    <div>
      <div className="flex justify-between gap-3 mb-1">
        <span className="font-body text-text-mid text-sm">{label}</span>
        <span className="font-body font-semibold text-sm" style={{ color: scoreColor(score) }}>
          {score}%
        </span>
      </div>
      <div className="h-2 bg-[#f4f4f8] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: scoreColor(score) }}
        />
      </div>
      {feedback && (
        <p className="font-body text-text-light text-xs leading-relaxed mt-2">{feedback}</p>
      )}
    </div>
  )
}

function KeywordTag({ word, matched }) {
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium"
      style={{
        background: matched ? '#dcfce7' : '#fff7ed',
        color: matched ? '#16a34a' : '#ea580c',
        border: `1px solid ${matched ? '#bbf7d0' : '#fed7aa'}`,
      }}
    >
      {matched ? '✓' : '✗'} {word}
    </span>
  )
}

export default function ATSScore() {
  const navigate = useNavigate()
  const [resumeText, setResumeText] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [jobDesc, setJobDesc] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setResumeFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setResumeText(event.target.result)
    }
    reader.readAsText(file)
  }

  const handleAnalyze = async () => {
  if (!resumeText.trim() || !jobDesc.trim()) return
  setLoading(true)
  setError('')
  setResult(null)

  try {
    const res = await fetch(`${BASE_URL}/ats/analyze`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ resume: resumeText, jobDescription: jobDesc }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Analysis failed')
    setResult(data)
  } catch (err) {
    setError(err.message || 'Analysis failed. Please try again.')
  } finally {
    setLoading(false)
  }
}

  const handleReset = () => {
    setResult(null)
    setResumeText('')
    setResumeFile(null)
    setJobDesc('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f7ff] via-[#f0f0f0] to-[#f5f3ff] font-body">

      {/* Header */}
      <div className="bg-white border-b border-border-light px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-text-mid hover:text-primary font-body text-sm transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ATS Score Checker
          </button>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
            ✦ Premium
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Title */}
        <div>
          <h1 className="font-heading font-bold text-3xl text-text-dark">ATS Score Checker</h1>
          <p className="font-body text-text-mid text-sm mt-1">
            Upload your resume and paste a job description to see how well you match the role.
          </p>
        </div>

        {/* Input Section */}
        {!result && (
          <div className="bg-white border border-border-light rounded-3xl p-8 shadow-sm flex flex-col gap-6">

            {/* Resume Upload */}
            <div className="flex flex-col gap-2">
              <label className="font-body font-semibold text-text-dark text-sm">
                Your Resume
              </label>
              <div
                onClick={() => document.getElementById('resumeUpload').click()}
                className="w-full border-2 border-dashed border-border-light rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-[#f8f7ff] transition-all"
                style={{ minHeight: '180px' }}
              >
                {resumeFile ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#5B4FF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#5B4FF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="font-body font-semibold text-text-dark text-sm">{resumeFile.name}</p>
                    <p className="font-body text-text-light text-xs">Click to change file</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#5B4FF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="font-body font-semibold text-text-dark text-sm">Upload your resume</p>
                    <p className="font-body text-text-light text-xs">PDF or DOCX supported</p>
                  </>
                )}
                <input
                  id="resumeUpload"
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Job Description */}
            <div className="flex flex-col gap-2">
              <label className="font-body font-semibold text-text-dark text-sm">
                Job Description
              </label>
              <textarea
                rows={8}
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full border border-border-light rounded-2xl p-4 font-body text-sm text-text-dark placeholder:text-text-light resize-none focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-body">{error}</p>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!resumeText.trim() || !jobDesc.trim() || loading}
              className="w-full bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-4 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing your resume...
                </span>
              ) : (
                'Check ATS Score'
              )}
            </button>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <>
            {/* Hero Score Card */}
            <div className="bg-white border border-border-light rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <div className="relative w-36 h-36">
                    <svg width="144" height="144" viewBox="0 0 112 112">
                      <circle cx="56" cy="56" r="48" fill="none" stroke="#e8e8f0" strokeWidth="8" />
                      <circle
                        cx="56" cy="56" r="48"
                        fill="none"
                        stroke="url(#atsGrad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 48}`}
                        strokeDashoffset={`${2 * Math.PI * 48 * (1 - result.overallScore / 100)}`}
                        transform="rotate(-90 56 56)"
                      />
                      <defs>
                        <linearGradient id="atsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#5358F3" />
                          <stop offset="100%" stopColor="#9F3BDF" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="font-heading font-bold text-3xl text-text-dark">{result.overallScore}</span>
                        <span className="font-body text-text-light text-sm">/100</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="font-heading font-bold text-3xl text-text-dark mb-2">
                    {result.overallScore >= 80 ? 'Great ATS Match!' : result.overallScore >= 60 ? 'Decent Match' : 'Needs Improvement'}
                  </h2>
                  <p className="font-body text-text-mid text-sm leading-relaxed">{result.summary}</p>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-white border border-border-light rounded-3xl p-8 shadow-sm">
              <h2 className="font-heading font-bold text-2xl text-text-dark mb-6">Score Breakdown</h2>
              <div className="flex flex-col gap-5">
                <ScoreBar label="Overall ATS Score" score={result.overallScore} />
                <ScoreBar label="Keyword Match" score={result.keywordMatch} feedback="How well your resume keywords match the job description." />
                <ScoreBar label="Format & Readability" score={result.formatScore} feedback="How ATS-friendly your resume format is." />
                <ScoreBar label="Role Relevance" score={result.relevanceScore} feedback="How relevant your experience is to this specific role." />
              </div>
            </div>

            {/* Keywords */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-border-light rounded-3xl p-6 shadow-sm">
                <h3 className="font-heading font-semibold text-text-dark text-lg mb-4">✅ Matched Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {result.matchedKeywords?.length ? result.matchedKeywords.map((word, i) => (
                    <KeywordTag key={i} word={word} matched={true} />
                  )) : <p className="font-body text-text-light text-sm">No matched keywords found.</p>}
                </div>
              </div>
              <div className="bg-white border border-border-light rounded-3xl p-6 shadow-sm">
                <h3 className="font-heading font-semibold text-text-dark text-lg mb-4">❌ Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords?.length ? result.missingKeywords.map((word, i) => (
                    <KeywordTag key={i} word={word} matched={false} />
                  )) : <p className="font-body text-text-light text-sm">No missing keywords found.</p>}
                </div>
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-border-light rounded-2xl p-5 shadow-sm">
                <h3 className="font-heading font-semibold text-text-dark text-sm mb-4">Strengths</h3>
                <ul className="flex flex-col gap-2.5">
                  {result.strengths?.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#22c55e]" />
                      <span className="font-body text-text-mid text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-border-light rounded-2xl p-5 shadow-sm">
                <h3 className="font-heading font-semibold text-text-dark text-sm mb-4">How to Improve</h3>
                <ul className="flex flex-col gap-2.5">
                  {result.improvements?.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#f97316]" />
                      <span className="font-body text-text-mid text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3 pb-4">
              <button
                onClick={handleReset}
                className="flex-1 bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-4 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-95"
              >
                Check Another Resume
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-white border border-border-light hover:border-primary/30 text-text-dark font-body font-semibold py-4 rounded-2xl transition-all duration-200 hover:shadow-md active:scale-95"
              >
                Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}