const express = require('express')
const {
  getDashboard,
  uploadResume,
  scanResumeFace,
  startInterview,
  getSession,
  abandonSession,
  submitAnswer,
  getReport,
  getPregeneratedTts,
  generateInterviewTts,
  uploadFaceFrame,
  checkExistingResume,
  uploadFaceVector,
} = require('../controllers/interviewController')
const { protect, requireCredits } = require('../middleware/authMiddleware')

const router = express.Router()

router.use(protect)

router.get('/dashboard', getDashboard)
router.get('/check-resume', checkExistingResume)
router.post('/upload-resume', uploadResume)
router.post('/upload-face-vector/:resumeId', uploadFaceVector)
router.post('/scan-face', scanResumeFace)
router.post('/start', requireCredits, startInterview)
router.get('/:sessionId', getSession)
router.post('/:sessionId/abandon', abandonSession)
router.post('/:sessionId/answer', submitAnswer)
router.get('/:sessionId/report', getReport)
router.post('/:sessionId/tts/get-pregenerated', getPregeneratedTts)
router.post('/:sessionId/tts/interview', generateInterviewTts)
router.post('/:sessionId/face-frame', uploadFaceFrame)

module.exports = router

