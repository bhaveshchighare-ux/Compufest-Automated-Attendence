const mongoose = require('mongoose')

const TranscriptTurnSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true,
  },
  question: {
    type: String,
    default: '',
  },
  answer: {
    type: String,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false })

const InterviewSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userPlanAtStart: {
    type: String,
    enum: ['free', 'pro', 'premium'],
    default: 'free',
  },
  aiInterviewId: {
    type: String,
    required: true,
    index: true,
  },
  candidateId: {
    type: String,
    required: true,
  },
  resumeId: {
    type: String,
    required: true,
  },
  campaignId: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    default: '',
    trim: true,
  },
  mode: {
    type: String,
    enum: ['technical', 'hr', 'mixed', 'casestudy'],
    default: 'mixed',
  },
  durationMinutes: {
    type: Number,
    default: 20,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'abandoned'],
    default: 'active',
    index: true,
  },
  questionNumber: {
    type: Number,
    default: 1,
  },
  totalQuestions: {
    type: Number,
    default: 8,
  },
  currentQuestion: {
    type: String,
    default: '',
  },
  firstQuestion: {
    type: String,
    default: '',
  },
  resumeFile: {
    name: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  transcript: {
    type: [TranscriptTurnSchema],
    default: [],
  },
  lastAiResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  lastError: {
    type: String,
    default: '',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  abandonedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true })

InterviewSessionSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema)
