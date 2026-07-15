const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    minlength: 6,
    select: false,
    // not required — google users won't have password
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  googleId: {
    type: String,
    default: null,
  },

  // 🔑 Plan system
  plan: {
    type: String,
    enum: ['free', 'pro', 'premium'],
    default: 'free',
  },
  razorpayCustomerId: {
    type: String,
    default: null,
  },
  subscriptionId: {
    type: String,
    default: null,
  },
  planStatus: {
    type: String,
    enum: ['active', 'past_due', 'canceled', null],
    default: null,
  },
  monthlyInterviewsCount: {
    type: Number,
    default: 0,
  },
  billingCycleStart: {
    type: Date,
    default: Date.now,
  },

  // Credits for interviews
  interviewCredits: {
    type: Number,
    default: () => parseInt(process.env.FREE_PLAN_CREDITS) || 2, // free users get configured credits on signup
  },

  // Onboarding
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  onboardingData: {
    college: { type: String, default: '' },
    degree: { type: String, default: '' },
    graduationYear: { type: String, default: '' },
    targetRole: { type: String, default: '' },
    targetCompanies: { type: String, default: '' },
    linkedIn: { type: String, default: '' },
    experience: { type: String, default: '' },
  },

  isVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true })

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return
  if (this.$locals.passwordAlreadyHashed) return
  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Check if user has access to a feature
UserSchema.methods.hasAccess = function (requiredPlan) {
  const planHierarchy = { free: 0, pro: 1, premium: 2 }
  return planHierarchy[this.plan] >= planHierarchy[requiredPlan]
}

module.exports = mongoose.model('User', UserSchema)
