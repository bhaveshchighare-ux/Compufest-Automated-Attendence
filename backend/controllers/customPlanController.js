const CustomPlan = require('../models/CustomPlan')

// @desc    Submit a new custom plan inquiry request
// @route   POST /api/auth/custom-plan
// @access  Public
const submitCustomPlan = async (req, res) => {
  try {
    const { isTnp, needsBulk, orgName, description } = req.body

    // Simple validation safeguard
    if (!isTnp || !needsBulk || !orgName || !description) {
      return res.status(400).json({ message: 'Please provide all required fields' })
    }

    const newRequest = await CustomPlan.create({
      isTnp,
      needsBulk,
      orgName,
      description
    })

    res.status(201).json({
      success: true,
      message: 'Inquiry saved successfully!',
      data: newRequest
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error processing inquiry submission',
      error: error.message
    })
  }
}

module.exports = { submitCustomPlan }