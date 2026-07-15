const mongoose = require('mongoose')

const DashboardFeedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fingerprint: {
    type: String,
    required: true,
    index: true,
  },
  provider: {
    type: String,
    default: 'xai',
  },
  model: {
    type: String,
    default: '',
  },
  overallFeedback: {
    type: String,
    default: '',
  },
  recentFeedback: {
    type: String,
    default: '',
  },
}, { timestamps: true })

DashboardFeedbackSchema.index({ user: 1 }, { unique: true })

module.exports = mongoose.model('DashboardFeedback', DashboardFeedbackSchema)
