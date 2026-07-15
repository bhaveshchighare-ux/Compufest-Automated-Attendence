const express = require('express');
const router = express.Router();
const { getMembers, addMember, editMember, deleteMember, importMembers } = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All member routes require login

router.get('/', getMembers);
router.post('/', addMember);
router.put('/:id', editMember);
router.delete('/:id', deleteMember);
router.post('/import', importMembers);

module.exports = router;
