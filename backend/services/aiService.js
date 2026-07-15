const { PassThrough } = require('stream')
const axios = require('axios')

const getConfig = () => {
  const baseUrl = process.env.AI_API_BASE_URL?.replace(/\/$/, '')
  const apiKey = process.env.AI_API_KEY

  if (!baseUrl) {
    throw new Error('AI_API_BASE_URL is not configured')
  }

  if (!apiKey) {
    throw new Error('AI_API_KEY is not configured')
  }

  if (typeof fetch !== 'function' || typeof FormData !== 'function') {
    throw new Error('MockPrep backend requires Node 18+ for fetch and FormData support')
  }

  return { baseUrl, apiKey }
}

const parseJson = async (response) => {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

const buildErrorMessage = (status, payload) => {
  if (payload?.detail) return Array.isArray(payload.detail) ? payload.detail.join(', ') : payload.detail
  if (payload?.error) return payload.error
  if (payload?.message) return payload.message
  return `AI service request failed with status ${status}`
}

const requestJson = async (path, { method = 'GET', body } = {}) => {
  const { baseUrl, apiKey } = getConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, payload))
  }

  return payload
}

const requestBinary = async (path, { method = 'POST', body } = {}) => {
  const { baseUrl, apiKey } = getConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const payload = await parseJson(response)
    throw new Error(buildErrorMessage(response.status, payload))
  }

  const arrayBuffer = await response.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || 'audio/wav',
  }
}

const requestForm = async (path, formData) => {
  const { baseUrl, apiKey } = getConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
    },
    body: formData,
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, payload))
  }

  return payload
}

const uploadResume = async ({ stream, contentType, name, email }) => {
  const { baseUrl, apiKey } = getConfig()
  
  let byteCount = 0
  const passThrough = new PassThrough()
  
  stream.on('data', (chunk) => {
    byteCount += chunk.length
    if (byteCount > 5 * 1024 * 1024) {
      const err = Object.assign(new Error('Resume must be 5MB or smaller'), { statusCode: 400 })
      stream.destroy(err)
      passThrough.destroy(err)
    } else {
      passThrough.write(chunk)
    }
  })
  
  stream.on('end', () => passThrough.end())
  stream.on('error', (err) => passThrough.destroy(err))

  try {
    const response = await axios.post(`${baseUrl}/api/resumes/upload`, passThrough, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': contentType,
        'X-Candidate-Name': encodeURIComponent(name),
        'X-Candidate-Email': encodeURIComponent(email)
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    })
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(buildErrorMessage(error.response.status, error.response.data))
    }
    throw error
  }
}

const scanResumeFace = async ({ stream, contentType }) => {
  const { baseUrl, apiKey } = getConfig()
  
  let byteCount = 0
  const passThrough = new PassThrough()
  
  stream.on('data', (chunk) => {
    byteCount += chunk.length
    if (byteCount > 5 * 1024 * 1024) {
      const err = Object.assign(new Error('Resume must be 5MB or smaller'), { statusCode: 400 })
      stream.destroy(err)
      passThrough.destroy(err)
    } else {
      passThrough.write(chunk)
    }
  })
  
  stream.on('end', () => passThrough.end())
  stream.on('error', (err) => passThrough.destroy(err))

  try {
    const response = await axios.post(`${baseUrl}/api/resumes/scan-face`, passThrough, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': contentType
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    })
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(buildErrorMessage(error.response.status, error.response.data))
    }
    throw error
  }
}

const startInterview = async ({ candidateId, resumeId, campaignId, role, totalQuestions }) => (
  requestJson('/api/interviews/start', {
    method: 'POST',
    body: {
      candidate_id: candidateId,
      resume_id: resumeId,
      campaign_id: campaignId,
      role,
      total_questions: totalQuestions,
    },
  })
)

const submitAnswer = async ({ interviewId, answer }) => (
  requestJson('/api/interviews/handle', {
    method: 'POST',
    body: {
      interview_id: interviewId,
      answer,
    },
  })
)

const abandonInterview = async (interviewId) => (
  requestJson(`/api/interviews/${interviewId}/abandon`, {
    method: 'POST',
  })
)

const fetchReport = async (interviewId) => requestJson(`/api/reports/${interviewId}`)

const getPregeneratedTts = async ({ interviewId, text, questionNo, maxWaitMs = 500 }) => (
  requestBinary('/api/tts/get-pregenerated', {
    body: {
      interview_id: interviewId,
      text,
      question_no: questionNo,
      max_wait_ms: maxWaitMs,
    },
  })
)

const generateInterviewTts = async ({ text }) => (
  requestBinary('/api/tts/interview', {
    body: { text },
  })
)

const uploadFaceFrame = async ({ interviewId, vector, cheating_details }) => {
  return requestJson('/api/face-analysis/frame', {
    method: 'POST',
    body: {
      interview_id: interviewId,
      vector,
      cheating_details,
    },
  })
}

const checkExistingResume = async (email) => (
  requestJson(`/api/resumes/check?email=${encodeURIComponent(email)}`)
)

const updateFaceVector = async (resumeId, candidateImageVector) => (
  requestJson(`/api/resumes/${resumeId}/face-vector`, {
    method: 'POST',
    body: {
      candidate_image_vector: candidateImageVector,
    },
  })
)

module.exports = {
  uploadResume,
  scanResumeFace,
  startInterview,
  submitAnswer,
  abandonInterview,
  fetchReport,
  getPregeneratedTts,
  generateInterviewTts,
  uploadFaceFrame,
  checkExistingResume,
  updateFaceVector,
}
