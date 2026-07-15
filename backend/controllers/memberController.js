const db = require('../config/firebase');

// @GET /api/members
const getMembers = async (req, res) => {
  try {
    const q = req.query.q?.trim().toLowerCase();
    const membersSnapshot = await db.collection('members').get();
    
    let members = [];
    membersSnapshot.forEach(doc => {
      members.push({ id: doc.id, ...doc.data() });
    });

    if (q) {
      members = members.filter(m => 
        m.registrationNumber?.toLowerCase().includes(q) ||
        m.name?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.branch?.toLowerCase().includes(q) ||
        m.committee?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.mobileNumber?.includes(q)
      );
    }

    res.status(200).json({ success: true, count: members.length, data: members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving members' });
  }
};

// @POST /api/members
const addMember = async (req, res) => {
  try {
    const { registrationNumber, name, year, committee, role, mobileNumber, branch } = req.body;
    
    if (!registrationNumber || !name || !year || !committee || !role || !mobileNumber || !branch) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const docId = registrationNumber.trim().toUpperCase();
    const memberDoc = await db.collection('members').doc(docId).get();
    
    if (memberDoc.exists) {
      return res.status(400).json({ success: false, message: `Member with Registration Number ${docId} already exists` });
    }

    if (!['AIDS', 'C.tech', 'IoT'].includes(branch)) {
      return res.status(400).json({ success: false, message: 'Invalid branch. Must be AIDS, C.tech, or IoT' });
    }

    const newMember = {
      registrationNumber: docId,
      name: name.trim(),
      department: 'C.tech', // Enforced as C.tech
      branch: branch.trim(),
      year: year.trim(),
      committee: committee.trim(),
      role: role.trim(),
      mobileNumber: mobileNumber.trim(),
      createdAt: new Date().toISOString()
    };

    await db.collection('members').doc(docId).set(newMember);

    res.status(201).json({ success: true, data: newMember });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ success: false, message: 'Server error adding member' });
  }
};

// @PUT /api/members/:id
const editMember = async (req, res) => {
  try {
    const { id } = req.params; // Registration number or ID
    const { name, year, committee, role, mobileNumber, branch } = req.body;

    if (!name || !year || !committee || !role || !mobileNumber || !branch) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const docId = id.trim().toUpperCase();
    const memberDoc = await db.collection('members').doc(docId).get();
    
    if (!memberDoc.exists) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (!['AIDS', 'C.tech', 'IoT'].includes(branch)) {
      return res.status(400).json({ success: false, message: 'Invalid branch. Must be AIDS, C.tech, or IoT' });
    }

    const updatedData = {
      name: name.trim(),
      department: 'C.tech', // Enforced as C.tech
      branch: branch.trim(),
      year: year.trim(),
      committee: committee.trim(),
      role: role.trim(),
      mobileNumber: mobileNumber.trim(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('members').doc(docId).update(updatedData);

    res.status(200).json({ success: true, data: { registrationNumber: docId, ...memberDoc.data(), ...updatedData } });
  } catch (error) {
    console.error('Edit member error:', error);
    res.status(500).json({ success: false, message: 'Server error updating member' });
  }
};

// @DELETE /api/members/:id
const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const docId = id.trim().toUpperCase();
    const memberDoc = await db.collection('members').doc(docId).get();

    if (!memberDoc.exists) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await db.collection('members').doc(docId).delete();

    res.status(200).json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting member' });
  }
};

// @POST /api/members/import
const importMembers = async (req, res) => {
  try {
    const { members } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of members' });
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const member of members) {
      const { registrationNumber, name, year, committee, role, mobileNumber, branch } = member;
      if (!registrationNumber || !name || !year || !committee || !role || !mobileNumber) {
        skippedCount++;
        continue;
      }

      const docId = registrationNumber.toString().trim().toUpperCase();
      const memberDoc = await db.collection('members').doc(docId).get();

      if (memberDoc.exists) {
        skippedCount++;
        continue;
      }

      // Default branch if not provided or invalid is 'C.tech'
      const finalBranch = ['AIDS', 'C.tech', 'IoT'].includes(branch) ? branch : 'C.tech';

      const newMember = {
        registrationNumber: docId,
        name: name.toString().trim(),
        department: 'C.tech', // Enforced as C.tech
        branch: finalBranch,
        year: year.toString().trim(),
        committee: committee.toString().trim(),
        role: role.toString().trim(),
        mobileNumber: mobileNumber.toString().trim(),
        createdAt: new Date().toISOString()
      };

      await db.collection('members').doc(docId).set(newMember);
      addedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully imported ${addedCount} members. Skipped ${skippedCount} duplicates/invalid rows.`,
      addedCount,
      skippedCount
    });
  } catch (error) {
    console.error('Import members error:', error);
    res.status(500).json({ success: false, message: 'Server error during member import' });
  }
};

module.exports = {
  getMembers,
  addMember,
  editMember,
  deleteMember,
  importMembers,
};
