const jwt = require('jsonwebtoken');
const db = require('../config/firebase');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userDoc = await db.collection('users').doc(decoded.id).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const userData = userDoc.data();
    // Exclude password from req.user
    delete userData.password;
    req.user = userData;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

const checkRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { protect, checkRole };
