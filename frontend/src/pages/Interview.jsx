import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { BASE_URL, getAuthHeaders, interviewAPI } from '../lib/api'
import { getFaceEmbedding } from '../lib/faceApiHelper'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import './Interview.css'

const MAX_RESTARTS = 6
const MAX_ANSWER_SECONDS = 120
const INACTIVITY_MS = 3000
const FACE_CAPTURE_INTERVAL_MS = 1000
const AUDIO_FALLBACK_TIMEOUT_MS = 6000

const getStoredSession = () => {
  try {
    const stored = sessionStorage.getItem('mockprepInterviewSession')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function CompletionOverlay({ terminated, onDashboard, onViewReport }) {
  return (
    <div className="ir-complete-overlay">
      <div className={`ir-complete-modal ${terminated ? 'ir-complete-modal--terminated' : ''}`}>
        <div className="ir-complete-icon">
          {terminated ? <AlertTriangle size={34} /> : <CheckCircle size={34} />}
        </div>
        <h2>{terminated ? 'Interview Terminated' : 'Interview Complete'}</h2>
        <p>
          {terminated
            ? 'Your session was stopped because an integrity violation was detected.'
            : 'Your practice session is finished. Your feedback report is being prepared.'}
        </p>
        <div className="ir-complete-actions">
          {!terminated && (
            <button type="button" className="ir-complete-primary" onClick={onViewReport}>
              View Feedback
            </button>
          )}
          <button type="button" className="ir-complete-secondary" onClick={onDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Interview() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialSession = location.state || getStoredSession()

  const [sessionInfo, setSessionInfo] = useState(initialSession)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [timer, setTimer] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Preparing your interview...')
  const [aiQuestion, setAiQuestion] = useState(initialSession?.firstQuestion || '')
  const [, setUserAnswer] = useState('')
  const [micError, setMicError] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [thinkTimeLeft, setThinkTimeLeft] = useState(0)
  const [, setAnswerTimeLeft] = useState(0)
  const [, setLiveTranscript] = useState('')
  const [, setManualAnswer] = useState('')
  const [, setIsSpeechUnavailable] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(initialSession?.questionNumber || 1)
  const [totalQuestions, setTotalQuestions] = useState(initialSession?.totalQuestions || 8)
  const [, setIsSubmittingAnswer] = useState(false)
  const [faceAnalysisStatus, setFaceAnalysisStatus] = useState({
    verificationStatus: 'pending',
    cheatingStatus: 'clean',
    severity: 'clean',
    primaryReason: null,
    cheatingCount: 0,
  })
  const [proctoringNotification, setProctoringNotification] = useState(null)
  const [isTerminated, setIsTerminated] = useState(false)

  const thinkIntervalRef = useRef(null)
  const answerIntervalRef = useRef(null)
  const userVideoRef = useRef(null)
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const totalAnswerElapsedRef = useRef(0)
  const restartAttemptsRef = useRef(0)
  const inactivityTimeoutRef = useRef(null)
  const latestTranscriptRef = useRef('')
  const faceCaptureIntervalRef = useRef(null)
  const faceCanvasRef = useRef(null)
  const activeAudioRef = useRef(null)
  const audioFallbackTimeoutRef = useRef(null)
  const faceCaptureInFlightRef = useRef(false)
  const submitInFlightRef = useRef(false)
  const completionInFlightRef = useRef(false)
  const interviewCompletedRef = useRef(false)
  const sessionIdRef = useRef(initialSession?.sessionId || null)
  const questionNumberRef = useRef(initialSession?.questionNumber || 1)
  const totalQuestionsRef = useRef(initialSession?.totalQuestions || 8)
  const proctoringNotificationTimeoutRef = useRef(null)
  const lastProctoringNotificationRef = useRef('')
  const escapeCountRef = useRef(0)
  const violationCooldownRef = useRef(false)
  const proctoringWarningCountRef = useRef(0)
  const tagResetTimeoutRef = useRef(null)
  const lastNotificationTimeRef = useRef(0)
  const cocoSsdModelRef = useRef(null)
  const consecutiveLookAwayFramesRef = useRef(0)
  const activeViolationsRef = useRef({
    no_face: false,
    multiple_faces: false,
    looking_away: false,
    face_mismatch: false,
    phone_detected: false
  })

  useEffect(() => {
    if (!location?.state) return
    const nextSession = location.state
    setSessionInfo(nextSession)
    setAiQuestion(nextSession.firstQuestion || '')
    setQuestionNumber(nextSession.questionNumber || 1)
    setTotalQuestions(nextSession.totalQuestions || 8)
    sessionStorage.setItem('mockprepInterviewSession', JSON.stringify(nextSession))
  }, [location])

  useEffect(() => {
    sessionIdRef.current = sessionInfo?.sessionId || null
  }, [sessionInfo])

  useEffect(() => {
    questionNumberRef.current = questionNumber
  }, [questionNumber])

  useEffect(() => {
    totalQuestionsRef.current = totalQuestions
  }, [totalQuestions])

  const clearThinkInterval = () => {
    if (thinkIntervalRef.current) {
      clearInterval(thinkIntervalRef.current)
      thinkIntervalRef.current = null
    }
  }

  const clearTotalAnswerInterval = () => {
    if (answerIntervalRef.current) {
      clearInterval(answerIntervalRef.current)
      answerIntervalRef.current = null
    }
  }

  const clearInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current)
      inactivityTimeoutRef.current = null
    }
  }

  const clearAudioFallbackTimeout = () => {
    if (audioFallbackTimeoutRef.current) {
      clearTimeout(audioFallbackTimeoutRef.current)
      audioFallbackTimeoutRef.current = null
    }
  }

  const stopFaceCapture = () => {
    if (faceCaptureIntervalRef.current) {
      clearInterval(faceCaptureIntervalRef.current)
      faceCaptureIntervalRef.current = null
    }
  }

  const clearProctoringNotification = () => {
    if (proctoringNotificationTimeoutRef.current) {
      clearTimeout(proctoringNotificationTimeoutRef.current)
      proctoringNotificationTimeoutRef.current = null
    }
    setProctoringNotification(null)
  }

  const PROCTORING_VIOLATION_TYPES = ['no_face', 'multiple_faces', 'looking_away', 'face_mismatch', 'phone_detected']

  const showProctoringNotification = (message, severity = 'warning', type = 'general') => {
    if (!message) return

    const isProctoringViolation = PROCTORING_VIOLATION_TYPES.includes(type)

    if (isProctoringViolation && proctoringWarningCountRef.current >= 3) {
      console.log(`[Proctoring] Silently noted (${type}): ${message} [warning #${proctoringWarningCountRef.current + 1} — popup suppressed]`)
      return
    }

    if (lastProctoringNotificationRef.current === message) return

    if (isProctoringViolation) {
      proctoringWarningCountRef.current += 1
      console.log(`[Proctoring] Showing popup warning #${proctoringWarningCountRef.current}/3 (${type}): ${message}`)
    }

    lastProctoringNotificationRef.current = message
    clearProctoringNotification()
    setProctoringNotification({ message, severity })
    proctoringNotificationTimeoutRef.current = setTimeout(() => {
      setProctoringNotification(null)
      lastProctoringNotificationRef.current = ''
    }, 4000)
  }

  const stopRecognition = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current._autoRestart = false
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
      }
    } catch {
      // Browser speech recognition can throw if already stopped.
    }
  }

  const stopActiveAudio = () => {
    clearAudioFallbackTimeout()
    setIsAiSpeaking(false)

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause()
        activeAudioRef.current.src = ''
      } catch {
        // no-op
      }
      activeAudioRef.current = null
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      }
    } catch (error) {
      console.warn('Could not exit fullscreen:', error)
    }
  }

  const cleanupMedia = () => {
    if (tagResetTimeoutRef.current) clearTimeout(tagResetTimeoutRef.current)
    stopRecognition()
    stopFaceCapture()
    stopActiveAudio()
    exitFullscreen()
    streamRef.current?.getTracks?.().forEach((track) => track.stop())
    streamRef.current = null
  }

  const startInterview = async () => {
    setIsInterviewStarted(true)
    setTimer(0)
    setStatusMessage('Interview started. Speak your answers clearly.')

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Fullscreen requires a user gesture in some browsers.
    }
  }

  useEffect(() => {
    if (!sessionInfo?.sessionId) return undefined

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        streamRef.current = stream
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream
        }
        setStatusMessage('Camera and mic are on. Starting interview...')
        startInterview()
      } catch (err) {
        console.error('Camera/Mic error:', err)
        setStatusMessage('Please allow camera and mic access to continue.')
        if (err.name === 'NotAllowedError') setMicError(true)
        if (err.name === 'NotFoundError') setCameraError(true)
      }
    }

    initCamera()
    return () => cleanupMedia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionInfo?.sessionId])

  useEffect(() => {
    let interval
    if (isInterviewStarted) {
      interval = setInterval(() => setTimer((current) => current + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isInterviewStarted])

  const completeInterview = async ({ completionMessage, terminated = false }) => {
    if (completionInFlightRef.current) return
    completionInFlightRef.current = true
    interviewCompletedRef.current = true

    clearThinkInterval()
    clearTotalAnswerInterval()
    clearInactivityTimeout()
    cleanupMedia()
    clearProctoringNotification()
    setIsInterviewStarted(false)
    setIsListening(false)
    setAiQuestion('')
    setIsTerminated(terminated)
    setShowCompleteModal(true)
    setStatusMessage(completionMessage)
    sessionStorage.removeItem('mockprepInterviewSession')
    completionInFlightRef.current = false
  }

  const terminateInterview = async (reason) => {
    if (interviewCompletedRef.current) return
    setStatusMessage(`${reason} Please wait while your session is submitted...`)

    try {
      if (sessionIdRef.current) {
        await interviewAPI.abandonSession(sessionIdRef.current)
      }
    } catch (error) {
      console.warn('Could not mark interview as abandoned:', error)
    }

    completeInterview({
      completionMessage: reason,
      terminated: true,
    })
  }

  const captureFaceFrame = async () => {
    if (faceCaptureInFlightRef.current) return
    if (!sessionIdRef.current || !userVideoRef.current || !isInterviewStarted) return

    const video = userVideoRef.current
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return

    if (!faceCanvasRef.current) {
      faceCanvasRef.current = document.createElement('canvas')
    }

    const canvas = faceCanvasRef.current
    const targetWidth = 320
    const targetHeight = Math.max(180, Math.round((video.videoHeight / video.videoWidth) * targetWidth))
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, targetWidth, targetHeight)

    faceCaptureInFlightRef.current = true
    try {
      // Load COCO-SSD for phone detection if not already loaded
      if (!cocoSsdModelRef.current) {
        try {
          await tf.ready()
          cocoSsdModelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
        } catch (e) {
          console.warn("Failed to load COCO-SSD model for phone detection:", e)
        }
      }

      let phoneDetected = false
      if (cocoSsdModelRef.current) {
        try {
          const predictions = await cocoSsdModelRef.current.detect(video)
          phoneDetected = predictions.some(p => p.class === 'cell phone')
        } catch (e) {
          console.warn("Phone detection failed:", e)
        }
      }

      const vector = await getFaceEmbedding(canvas)
      const response = await interviewAPI.uploadFaceFrame(sessionIdRef.current, {
        vector: vector || null,
        cheating_details: {
          no_face: !vector,
          phone_detected: phoneDetected
        }
      })

      const result = response?.result
      if (!result) return

      const cumulativeSeverity = result?.cheating_summary?.severity || result?.proctoring_severity || 'clean'
      const currentSeverity = result?.cheating_detected ? (cumulativeSeverity === 'clean' ? 'warning' : cumulativeSeverity) : 'clean'
      const cheatingStatus = result?.cheating_detected ? 'suspicious' : 'clean';
      const newStatus = result?.verification_status || 'unverified';

      setFaceAnalysisStatus({
        verificationStatus: newStatus,
        severity: currentSeverity,
        cheatingStatus: cheatingStatus,
        primaryReason: result?.cheating_summary?.primary_reason || null,
        cheatingCount: result?.cheating_count ?? result?.cheating_summary?.cheating_events ?? 0,
      })

      if (tagResetTimeoutRef.current) clearTimeout(tagResetTimeoutRef.current)

      if (currentSeverity !== 'clean') {
        tagResetTimeoutRef.current = setTimeout(() => {
          setFaceAnalysisStatus(prev => ({ ...prev, severity: 'clean', cheatingStatus: 'clean' }))
        }, 2000)
      }

      const cheatingDetails = result?.cheating_details || {}
      const noFace = cheatingDetails.no_face || false
      const multipleFaces = cheatingDetails.multiple_faces || false
      const lookingAway = cheatingDetails.looking_away || false

      if (!result?.terminated) {
        if (lookingAway) {
          consecutiveLookAwayFramesRef.current += 1;

          if (
            consecutiveLookAwayFramesRef.current >= 2 &&
            !activeViolationsRef.current.looking_away
          ) {
            showProctoringNotification(
              "⚠️ Please keep your face oriented toward the interview screen.",
              "warning",
              "looking_away"
            );
            activeViolationsRef.current.looking_away = true;
          }
        } else if (!noFace) {
          consecutiveLookAwayFramesRef.current = 0;
          activeViolationsRef.current.looking_away = false;
        }

        if (!noFace) {
          activeViolationsRef.current.no_face = false;
        }
        if (!multipleFaces) {
          activeViolationsRef.current.multiple_faces = false;
        }
        if (!phoneDetected) {
          activeViolationsRef.current.phone_detected = false;
        }
        if (newStatus !== 'unverified') {
          activeViolationsRef.current.face_mismatch = false;
        }

        if (phoneDetected) {
          if (!activeViolationsRef.current.phone_detected) {
            showProctoringNotification("⚠️ Cell phone detected! Use of devices is strictly prohibited.", "serious", "phone_detected");
            activeViolationsRef.current.phone_detected = true;
          }
        }

        if (noFace) {
          if (!activeViolationsRef.current.no_face) {
            showProctoringNotification("⚠️ No face detected. Please face the camera.", "warning", "no_face");
            activeViolationsRef.current.no_face = true;
          }
        } else if (multipleFaces) {
          if (!activeViolationsRef.current.multiple_faces) {
            showProctoringNotification("⚠️ Multiple faces detected. Ensure you are alone.", "serious", "multiple_faces");
            activeViolationsRef.current.multiple_faces = true;
          }
        } else if (!phoneDetected && newStatus === 'unverified') {
          if (!activeViolationsRef.current.face_mismatch) {
            showProctoringNotification("⚠️ Face mismatch detected. Please verify your identity.", "serious", "face_mismatch");
            activeViolationsRef.current.face_mismatch = true;
          }
        }
      }

      if (result?.terminated) {
        await terminateInterview('Interview ended because proctoring detected a serious integrity issue.')
      }
    } catch (error) {
      console.warn('Face analysis request failed:', error)
    } finally {
      faceCaptureInFlightRef.current = false
    }
  }

  useEffect(() => {
    stopFaceCapture()

    if (!isInterviewStarted || !sessionIdRef.current) {
      return undefined
    }

    captureFaceFrame()
    faceCaptureIntervalRef.current = setInterval(captureFaceFrame, FACE_CAPTURE_INTERVAL_MS)

    return () => stopFaceCapture()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterviewStarted])

  useEffect(() => {
    if (!isInterviewStarted) return undefined

    const lockKeyboard = async () => {
      if (navigator.keyboard?.lock) {
        try {
          await navigator.keyboard.lock()
        } catch (err) {
          console.warn('Keyboard lock failed:', err)
        }
      }
    }

    const registerViolation = () => {
      if (!isInterviewStarted || interviewCompletedRef.current || violationCooldownRef.current) return

      violationCooldownRef.current = true
      setTimeout(() => {
        violationCooldownRef.current = false
      }, 1000)

      escapeCountRef.current += 1

      if (escapeCountRef.current === 1) {
        showProctoringNotification(
          '⚠️ WARNING: Focus lost or fullscreen exited. You have 5 seconds to click back into the interview window, or the session will terminate.',
          'serious',
          'fullscreen'
        )

        setTimeout(async () => {
          try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen()
            }
          } catch (err) {
            console.warn('Fullscreen re-entry failed:', err)
          }
        }, 300)

        setTimeout(() => {
          if (interviewCompletedRef.current) return
          if (!document.hasFocus() || document.hidden) {
            escapeCountRef.current = 1
            registerViolation()
          }
        }, 5000)
      } else {
        terminateInterview('Interview terminated due to multiple fullscreen or focus violations.')
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        registerViolation()
        return
      }

      event.preventDefault()
      showProctoringNotification('⚠️ Keyboard input is disabled during the interview.', 'warning', 'keyboard')
    }

    const handleContextMenu = (event) => {
      event.preventDefault()
      showProctoringNotification('⚠️ Right-click is disabled.', 'warning', 'right_click')
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        registerViolation()
      }
    }

    const handleWindowBlur = () => registerViolation()
    const handleVisibilityChange = () => {
      if (document.hidden) registerViolation()
    }

    lockKeyboard()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (navigator.keyboard?.unlock) {
        navigator.keyboard.unlock()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterviewStarted])

  const submitAnswer = async (answer) => {
    if (submitInFlightRef.current || !sessionIdRef.current) return

    submitInFlightRef.current = true
    setIsSubmittingAnswer(true)

    try {
      const data = await interviewAPI.submitAnswer(sessionIdRef.current, answer)

      if (data.stop === true || (!data.nextQuestion && !data.next_question)) {
        await completeInterview({
          completionMessage: 'Interview finished and report generated successfully.',
        })
        return
      }

      const nextQuestion = data.nextQuestion || data.next_question
      const backendQuestionNo = data.questionNumber || data.question_no || (questionNumberRef.current + 1)
      const backendTotalQuestions = data.totalQuestions || data.total_questions || totalQuestionsRef.current
      const nextSession = {
        ...sessionInfo,
        firstQuestion: nextQuestion,
        questionNumber: backendQuestionNo,
        totalQuestions: backendTotalQuestions,
      }

      questionNumberRef.current = backendQuestionNo
      totalQuestionsRef.current = backendTotalQuestions
      setQuestionNumber(backendQuestionNo)
      setTotalQuestions(backendTotalQuestions)
      setSessionInfo(nextSession)
      sessionStorage.setItem('mockprepInterviewSession', JSON.stringify(nextSession))
      setAiQuestion(nextQuestion)
      setUserAnswer('')
      setLiveTranscript('')
      setManualAnswer('')
      finalTranscriptRef.current = ''
      latestTranscriptRef.current = ''
      restartAttemptsRef.current = 0
    } catch (err) {
      console.error('Submit error:', err)
      setStatusMessage(`Error submitting your answer: ${err.message}`)
    } finally {
      submitInFlightRef.current = false
      setIsSubmittingAnswer(false)
    }
  }

  const finalizeAnswer = () => {
    if (submitInFlightRef.current) return

    clearInactivityTimeout()
    clearTotalAnswerInterval()
    setIsListening(false)
    if (tagResetTimeoutRef.current) clearTimeout(tagResetTimeoutRef.current)
    stopRecognition()

    const cleaned = ((finalTranscriptRef.current || '').trim() || (latestTranscriptRef.current || '').trim())
    if (cleaned) {
      setUserAnswer(cleaned)
      setManualAnswer(cleaned)
      setStatusMessage('Answer captured. Next question coming...')
      submitAnswer(cleaned)
    } else {
      setStatusMessage('No speech detected. Waiting for you to retry.')
    }

    finalTranscriptRef.current = ''
    latestTranscriptRef.current = ''
    totalAnswerElapsedRef.current = 0
    setLiveTranscript('')
    setManualAnswer('')
  }

  const startRecognitionForAnswer = (answerSeconds = MAX_ANSWER_SECONDS) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setStatusMessage('Speech recognition is not supported in this browser.')
      setIsSpeechUnavailable(true)
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current._autoRestart = false
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    } catch {
      // no-op
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition._autoRestart = true
    recognition._isAborted = false
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 5

    recognition.onstart = () => {
      setIsSpeechUnavailable(false)
      setIsListening(true)
      setStatusMessage('Listening... Speak now.')

      if (!answerIntervalRef.current) {
        totalAnswerElapsedRef.current = totalAnswerElapsedRef.current || 0
        answerIntervalRef.current = setInterval(() => {
          totalAnswerElapsedRef.current += 1
          const remaining = Math.max(0, answerSeconds - totalAnswerElapsedRef.current)
          setAnswerTimeLeft(remaining)
          if (totalAnswerElapsedRef.current >= answerSeconds) {
            clearTotalAnswerInterval()
            finalizeAnswer()
          }
        }, 1000)
      }

      clearInactivityTimeout()
    }

    recognition.onresult = (event) => {
      setIsListening(true)
      setStatusMessage('Listening... Speak now.')
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += `${transcript} `
          restartAttemptsRef.current = 0
        } else {
          interim += transcript
        }
      }

      const fullText = finalTranscriptRef.current + interim
      setUserAnswer(fullText)
      setLiveTranscript(fullText)
      setManualAnswer(fullText)
      latestTranscriptRef.current = fullText

      clearInactivityTimeout()
      inactivityTimeoutRef.current = setTimeout(() => {
        finalizeAnswer()
      }, INACTIVITY_MS)
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted') {
        recognition._isAborted = true
        recognition._autoRestart = false
        setStatusMessage('Recognition stopped. Please allow mic access and retry.')
        setIsListening(false)
        return
      }

      if (event.error === 'network') {
        recognition._isAborted = true
        recognition._autoRestart = false
        clearInactivityTimeout()
        clearTotalAnswerInterval()
        setIsListening(false)
        setIsSpeechUnavailable(true)
        setStatusMessage('Speech recognition had a network issue. Automatically submitting current answer...')
        finalizeAnswer()
        return
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        recognition._isAborted = true
        recognition._autoRestart = false
        clearInactivityTimeout()
        clearTotalAnswerInterval()
        setIsListening(false)
        setIsSpeechUnavailable(true)
        setStatusMessage('Mic permission denied. Moving to next question without audio...')
        finalizeAnswer()
        return
      }

      setStatusMessage(`Recognition error: ${event.error}`)
    }

    recognition.onend = () => {
      if (recognition._isAborted || recognition._autoRestart === false) {
        setIsListening(false)
        return
      }

      if (totalAnswerElapsedRef.current < answerSeconds) {
        restartAttemptsRef.current = (restartAttemptsRef.current || 0) + 1
        if (restartAttemptsRef.current <= MAX_RESTARTS) {
          setTimeout(() => {
            try {
              startRecognitionForAnswer(answerSeconds - totalAnswerElapsedRef.current)
            } catch {
              // no-op
            }
          }, 500 + restartAttemptsRef.current * 150)
          return
        }

        setStatusMessage('Speech recognition is unstable. Automatically submitting current answer...')
        finalizeAnswer()
        return
      }

      if (totalAnswerElapsedRef.current >= answerSeconds) {
        finalizeAnswer()
      }
    }

    setTimeout(() => {
      try {
        recognition.start()
      } catch {
        setStatusMessage('Recognition start failed. Please retry.')
      }
    }, 300)
  }

  const fetchAudio = async (endpoint, body) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Audio request failed with ${response.status}`)
    }

    return response.blob()
  }

  const speakThenListen = async (text, answerSeconds = MAX_ANSWER_SECONDS) => {
    if (!sessionIdRef.current || !text) return

    setStatusMessage('Playing question...')
    stopActiveAudio()
    setIsAiSpeaking(true)

    try {
      let audioBlob
      try {
        audioBlob = await fetchAudio(`/interviews/${sessionIdRef.current}/tts/get-pregenerated`, {
          text,
          questionNo: questionNumberRef.current,
          maxWaitMs: 500,
        })
      } catch {
        audioBlob = await fetchAudio(`/interviews/${sessionIdRef.current}/tts/interview`, { text })
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audio.playbackRate = 0.9
      activeAudioRef.current = audio
      let listeningStarted = false

      const beginListening = () => {
        if (listeningStarted) return
        listeningStarted = true
        clearAudioFallbackTimeout()
        URL.revokeObjectURL(audioUrl)
        activeAudioRef.current = null
        setIsAiSpeaking(false)
        setStatusMessage('Listening... Speak now.')
        startRecognitionForAnswer(answerSeconds)
      }

      audio.onended = beginListening
      audio.onerror = beginListening
      audio.onplaying = () => {
        clearAudioFallbackTimeout()
        setStatusMessage('Question playing...')
      }

      audioFallbackTimeoutRef.current = setTimeout(() => {
        console.warn('Audio playback timed out; falling back to listening.')
        beginListening()
      }, AUDIO_FALLBACK_TIMEOUT_MS)

      await audio.play()
    } catch (error) {
      console.error('TTS Error:', error)
      stopActiveAudio()
      setStatusMessage('Starting to listen...')
      startRecognitionForAnswer(answerSeconds)
    }
  }

  useEffect(() => {
    if (!aiQuestion || !isInterviewStarted) return undefined

    finalTranscriptRef.current = ''
    totalAnswerElapsedRef.current = 0
    setAnswerTimeLeft(MAX_ANSWER_SECONDS)
    setLiveTranscript('')
    setManualAnswer('')
    speakThenListen(aiQuestion, MAX_ANSWER_SECONDS)

    return () => {
      clearThinkInterval()
      clearTotalAnswerInterval()
      clearInactivityTimeout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiQuestion, isInterviewStarted])

  const startAnswerNow = () => {
    clearThinkInterval()
    setThinkTimeLeft(0)
    setStatusMessage('Skipping thinking time. Speaking question now...')
    speakThenListen(aiQuestion, MAX_ANSWER_SECONDS)
  }



  useEffect(() => () => {
    clearThinkInterval()
    clearTotalAnswerInterval()
    clearInactivityTimeout()
    stopFaceCapture()
    stopActiveAudio()
    exitFullscreen()
    if (tagResetTimeoutRef.current) clearTimeout(tagResetTimeoutRef.current)
    stopRecognition()
    streamRef.current?.getTracks?.().forEach((track) => track.stop())
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToDashboard = async () => {
    await exitFullscreen()
    navigate('/dashboard', { replace: true })
  }

  const viewReport = async () => {
    await exitFullscreen()
    navigate(`/report?sessionId=${sessionIdRef.current}`)
  }

  if (!sessionInfo?.sessionId) {
    return (
      <div className="ir-empty">
        <div className="ir-empty-card">
          <h1>No active interview</h1>
          <p>Start a new session to enter the live interview room.</p>
          <button type="button" onClick={() => navigate('/start-interview')}>
            Start Interview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ir-container">
      <div className="ir-layout">
        {proctoringNotification && (
          <div className={`ir-proctoring-modal ir-proctoring-modal--${proctoringNotification.severity}`}>
            {proctoringNotification.severity === 'success' ? (
              <CheckCircle size={32} color="#27ae60" className="ir-proctoring-icon" />
            ) : (
              <AlertTriangle
                size={32}
                color={proctoringNotification.severity === 'serious' ? '#e74c3c' : '#f39c12'}
                className="ir-proctoring-icon"
              />
            )}
            <div className="ir-proctoring-modal-content">
              <h2 className={`ir-proctoring-title ir-proctoring-title--${proctoringNotification.severity}`}>
                {proctoringNotification.severity === 'success'
                  ? 'Verification Success'
                  : proctoringNotification.severity === 'serious'
                    ? 'Proctoring Alert'
                    : 'Proctoring Warning'}
              </h2>
              <p className="ir-proctoring-message">{proctoringNotification.message}</p>
            </div>
          </div>
        )}

        <div className="ir-sidebar">
          <div className="ir-header">
            <div>
              <h1 className="ir-logo">MockPrep.ai</h1>
              <p className="ir-tagline">AI-Powered Interview Platform</p>
            </div>
          </div>

          <div className="ir-progress">
            <div className="ir-progress-label">Question {questionNumber} of {totalQuestions}</div>
            <div className="ir-progress-track">
              <div
                className="ir-progress-fill"
                style={{ width: `${(questionNumber / Math.max(totalQuestions, 1)) * 100}%` }}
              />
            </div>
            <div className="ir-progress-dots">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <div
                  key={i}
                  className={`ir-dot ${i < questionNumber ? 'ir-dot--done' : i === questionNumber - 1 ? 'ir-dot--active' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="ir-badges">
            <div className="ir-badge"><Clock size={16} /> {formatTime(timer)}</div>
            <div className={`ir-badge ${isInterviewStarted ? 'ir-badge--active' : ''}`}>
              {isInterviewStarted ? 'Interview Active' : 'Ready'}
            </div>
            <div className={`ir-badge ${isListening ? 'ir-badge--active' : ''}`}>
              {isListening ? 'Listening...' : 'Idle'}
            </div>
            <div className={`ir-badge ${faceAnalysisStatus.verificationStatus === 'verified' ? 'ir-badge--verified' : faceAnalysisStatus.verificationStatus === 'pending' ? '' : 'ir-badge--warning'}`}>
              Verification: {faceAnalysisStatus.verificationStatus === 'verified' ? 'Verified' : faceAnalysisStatus.verificationStatus === 'pending' ? 'Pending...' : faceAnalysisStatus.verificationStatus === 'no_reference' ? 'No Photo' : 'Unverified'}
            </div>
            <div className={`ir-badge ${faceAnalysisStatus.severity === 'serious' ? 'ir-badge--warning' : faceAnalysisStatus.severity === 'warning' ? 'ir-badge--notice' : ''}`}>
              Proctoring: {faceAnalysisStatus.severity === 'serious' ? 'Serious Issue' : faceAnalysisStatus.severity === 'warning' ? 'Warning' : 'Clean'}
            </div>
          </div>

          <div className="ir-card">
            <div className="ir-card-header"><h2 className="ir-card-title">Status</h2></div>
            <div className="ir-card-body">
              <p className="ir-status">{statusMessage}</p>
              <p className="ir-status ir-status--muted">
                Identity verification and cheating detection are tracked separately.
              </p>
              <p className="ir-status" style={{ fontSize: '0.9rem' }}>
                <strong>Verification:</strong> {faceAnalysisStatus.verificationStatus === 'verified' ? 'Verified ✅' : faceAnalysisStatus.verificationStatus === 'pending' ? 'Pending...' : faceAnalysisStatus.verificationStatus === 'no_reference' ? 'No reference photo' : 'Unverified ❌'}
              </p>
              <p className="ir-status ir-status--small">
                <strong>Proctoring status:</strong> {faceAnalysisStatus.severity === 'serious' ? 'Serious issue' : faceAnalysisStatus.severity === 'warning' ? 'Warning only' : 'Clean'}
                {faceAnalysisStatus.cheatingCount > 0 ? ` (${faceAnalysisStatus.cheatingCount} events)` : ''}
              </p>
              {micError && <p className="ir-error">Microphone access denied.</p>}
              {cameraError && <p className="ir-error">Camera access denied.</p>}
              {thinkTimeLeft > 0 && (
                <div className="ir-think-bar">
                  <strong>Thinking time:</strong> {thinkTimeLeft}s
                  <button type="button" className="ir-skip-btn" onClick={startAnswerNow}>Start Answer Now</button>
                </div>
              )}
            </div>

            <div className="ir-question-section">
              <h3 className="ir-section-label">AI Question:</h3>
              <p className={`ir-question-text ${isAiSpeaking ? 'ir-question-text--speaking' : ''}`}>
                {aiQuestion || 'Waiting for question...'}
              </p>
            </div>

            <div className="ir-waveform">
              <p className="ir-waveform-label">
                {isAiSpeaking ? 'AI is speaking...' : isListening ? 'You are speaking...' : 'Waiting...'}
              </p>
              <div className="ir-waveform-bars">
                {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                  <div
                    key={bar}
                    className={`ir-bar ${isAiSpeaking ? 'ir-bar--ai' : isListening ? 'ir-bar--user' : ''}`}
                    style={{ animationDelay: `${bar * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>


        </div>

        <div className="ir-video-panel">
          <video ref={userVideoRef} autoPlay muted playsInline className="ir-video" />
        </div>
      </div>

      {showCompleteModal && (
        <CompletionOverlay
          terminated={isTerminated}
          onDashboard={goToDashboard}
          onViewReport={viewReport}
        />
      )}
    </div>
  )
}
