const mongoose = require('mongoose')

const CustomPlanSchema = new mongoose.Schema({
  isTnp: {
    type: String,
    required: true,
    enum: ['Yes', 'No']
  },
  needsBulk: {
    type: String,
    required: true,
    enum: ['Yes', 'No']
  },
  orgName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    default: 'pending', // Keeps track of review actions
    enum: ['pending', 'contacted', 'resolved']
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
})

module.exports = mongoose.model('CustomPlan', CustomPlanSchema)