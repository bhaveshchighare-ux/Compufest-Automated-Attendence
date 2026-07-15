const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/authMiddleware')
const {
  createSubscription,
  verifySubscription,
  cancelSubscription,
} = require('../controllers/paymentController')

router.post('/create-subscription', protect, createSubscription)
router.post('/verify', protect, verifySubscription)
router.post('/cancel', protect, cancelSubscription)

module.exports = router
