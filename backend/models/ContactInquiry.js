const mongoose = require('mongoose')

const ContactInquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  collegeName: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    required: [true, 'Gmail is required'],
    lowercase: true,
    trim: true,
    match: [/^[\w-\.]+@gmail\.com$/, 'Please provide a valid Gmail address ending in @gmail.com'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  forWhom: {
    type: String,
    required: [true, 'For Whom selection is required'],
    enum: ['TNP', 'Bulk Plan'],
  },
  creditsRequested: {
    type: Number,
    required: [true, 'Credits amount is required'],
  },
  optionQuestions: {
    isOfficialPlacement: { type: Boolean, default: false },
    needCustomRoles: { type: Boolean, default: false },
    needAtsIntegration: { type: Boolean, default: false },
    requestWalkthrough: { type: Boolean, default: false },
  },
}, { timestamps: true })

module.exports = mongoose.model('ContactInquiry', ContactInquirySchema)
