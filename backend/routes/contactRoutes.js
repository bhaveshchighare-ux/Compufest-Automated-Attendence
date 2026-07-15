const express = require('express')
const router = express.Router()
const { submitContactInquiry } = require('../controllers/contactController')

router.post('/', submitContactInquiry)

module.exports = router
