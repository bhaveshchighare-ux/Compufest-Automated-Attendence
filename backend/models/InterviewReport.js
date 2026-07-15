const mongoose = require('mongoose')

const InterviewReportSchema = new mongoose.Schema({
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
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
    index: true,
  },
  aiInterviewId: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    default: '',
  },
  company: {
    type: String,
    default: '',
  },
  mode: {
    type: String,
    default: '',
  },
  durationMinutes: {
    type: Number,
    default: 20,
  },
  overallScore: {
    type: Number,
    default: 0,
  },
  performanceLevel: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
  scores: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  strengths: {
    type: [String],
    default: [],
  },
  weaknesses: {
    type: [String],
    default: [],
  },
  recommendations: {
    type: [String],
    default: [],
  },
  improvementPlan: {
    type: [String],
    default: [],
  },
  questionFeedback: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  rawReport: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, { timestamps: true })

InterviewReportSchema.index({ session: 1, user: 1 }, { unique: true })

module.exports = mongoose.model('InterviewReport', InterviewReportSchema)
