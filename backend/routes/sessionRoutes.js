const express = require('express');
const router = express.Router();
const { getSessions, createSession, getSession, updateAttendance, deleteSession } = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All session routes require login

router.get('/', getSessions);
router.post('/', createSession);
router.get('/:id', getSession);
router.put('/:id/attendance', updateAttendance);
router.delete('/:id', deleteSession);

module.exports = router;
