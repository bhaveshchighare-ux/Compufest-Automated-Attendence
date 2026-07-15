const ContactInquiry = require('../models/ContactInquiry')
const { sendRawEmail } = require('../services/emailService')

const gmailRegex = /^[\w-\.]+@gmail\.com$/

// @POST /api/contact
const submitContactInquiry = async (req, res) => {
  try {
    const {
      name,
      collegeName,
      email,
      description,
      forWhom,
      creditsRequested,
      optionQuestions,
    } = req.body

    const normalizedName = name?.trim()
    const normalizedCollege = collegeName?.trim() || ''
    const normalizedEmail = email?.trim().toLowerCase()
    const normalizedDesc = description?.trim()

    if (!normalizedName) {
      return res.status(400).json({ success: false, message: 'Name of the person requesting is required' })
    }

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Gmail is required' })
    }

    if (!gmailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid Gmail address ending in @gmail.com' })
    }

    if (!normalizedDesc) {
      return res.status(400).json({ success: false, message: 'Description is required' })
    }

    if (!forWhom || !['TNP', 'Bulk Plan'].includes(forWhom)) {
      return res.status(400).json({ success: false, message: 'Please specify if this inquiry is for TNP or Bulk Plan' })
    }

    if (creditsRequested === undefined || creditsRequested === null || isNaN(creditsRequested) || Number(creditsRequested) <= 0) {
      return res.status(400).json({ success: false, message: 'Requested credits count must be a number greater than 0' })
    }

    const newInquiry = await ContactInquiry.create({
      name: normalizedName,
      collegeName: normalizedCollege,
      email: normalizedEmail,
      description: normalizedDesc,
      forWhom,
      creditsRequested: Number(creditsRequested),
      optionQuestions: {
        isOfficialPlacement: Boolean(optionQuestions?.isOfficialPlacement),
        needCustomRoles: Boolean(optionQuestions?.needCustomRoles),
        needAtsIntegration: Boolean(optionQuestions?.needAtsIntegration),
        requestWalkthrough: Boolean(optionQuestions?.requestWalkthrough),
      },
    })

    // Email notification if possible
    try {
      const from = process.env.SMTP_FROM || 'MockPrep.ai <no-reply@mockprep.ai>'
      await sendRawEmail({
        from,
        to: process.env.SMTP_USER || 'admin@mockprep.ai',
        subject: `New Contact Inquiry from ${normalizedName} (${forWhom})`,
        text: `
          New contact inquiry received:
          Name: ${normalizedName}
          College Name: ${normalizedCollege || 'N/A'}
          Email: ${normalizedEmail}
          For Whom: ${forWhom}
          Credits Requested: ${creditsRequested}
          Description: ${normalizedDesc}

          Option-based questions:
          - Official Placement Department? ${optionQuestions?.isOfficialPlacement ? 'Yes' : 'No'}
          - Custom Roles needed? ${optionQuestions?.needCustomRoles ? 'Yes' : 'No'}
          - ATS Integration needed? ${optionQuestions?.needAtsIntegration ? 'Yes' : 'No'}
          - Placement Coordinator walkthrough? ${optionQuestions?.requestWalkthrough ? 'Yes' : 'No'}
        `,
      })
    } catch (err) {
      console.warn('Could not send contact inquiry notification email:', err.message)
    }

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been submitted successfully. Our team will contact you shortly.',
      inquiry: newInquiry,
    })
  } catch (error) {
    console.error('Contact Inquiry submission error:', error)
    res.status(500).json({ success: false, message: 'Server error during submission. Please try again.' })
  }
}

module.exports = { submitContactInquiry }
