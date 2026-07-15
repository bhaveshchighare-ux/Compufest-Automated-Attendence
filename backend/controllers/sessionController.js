const db = require('../config/firebase');

// @GET /api/sessions
const getSessions = async (req, res) => {
  try {
    const sessionsSnapshot = await db.collection('sessions').get();
    const sessions = [];
    sessionsSnapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });

    // Sort by createdAt descending
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving sessions' });
  }
};

// @POST /api/sessions
const createSession = async (req, res) => {
  try {
    const { name, date } = req.body;
    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Please provide session name and date' });
    }

    const newSession = {
      name: name.trim(),
      date: date.trim(), // YYYY-MM-DD
      createdAt: new Date().toISOString(),
      attendance: {} // Key: registrationNumber, Value: { status, timestamp }
    };

    const docRef = await db.collection('sessions').add(newSession);

    res.status(201).json({ success: true, data: { id: docRef.id, ...newSession } });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, message: 'Server error creating session' });
  }
};

// @GET /api/sessions/:id
const getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionDoc = await db.collection('sessions').doc(id).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.status(200).json({ success: true, data: { id: sessionDoc.id, ...sessionDoc.data() } });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving session' });
  }
};

// @PUT /api/sessions/:id/attendance
// One-click marking and auto-saving individual attendance
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { registrationNumber, status } = req.body;

    if (!registrationNumber || !['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Please provide registrationNumber and valid status (Present or Absent)' });
    }

    const sessionDoc = await db.collection('sessions').doc(id).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const regKey = registrationNumber.trim().toUpperCase();
    const sessionData = sessionDoc.data();
    const currentAttendance = sessionData.attendance || {};

    // Prevent duplicate saving if it's already the same status, but let's record time on first mark
    const existingRecord = currentAttendance[regKey];
    if (existingRecord && existingRecord.status === status) {
      return res.status(200).json({ success: true, message: 'Attendance status unchanged', data: sessionData });
    }

    const record = {
      status,
      timestamp: new Date().toISOString()
    };

    // Update inside Firestore
    const updatePath = `attendance.${regKey}`;
    await db.collection('sessions').doc(id).update({
      [updatePath]: record
    });

    // Fetch updated session to return
    const updatedDoc = await db.collection('sessions').doc(id).get();

    res.status(200).json({ success: true, message: 'Attendance updated successfully', data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error saving attendance' });
  }
};

// @DELETE /api/sessions/:id
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionDoc = await db.collection('sessions').doc(id).get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    await db.collection('sessions').doc(id).delete();

    res.status(200).json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting session' });
  }
};

module.exports = {
  getSessions,
  createSession,
  getSession,
  updateAttendance,
  deleteSession
};
