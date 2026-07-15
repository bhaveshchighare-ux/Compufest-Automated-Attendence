const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/firebase');

const generateToken = (email) => {
  return jwt.sign({ id: email }, process.env.JWT_SECRET || 'replace-with-a-long-random-secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const getTokenCookieOptions = () => ({
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
});

// Seed default user if empty
const seedDefaultUser = async () => {
  try {
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty || usersSnapshot.size === 0) {
      const email = 'admin@compufest.com';
      const passwordHash = await bcrypt.hash('adminpassword', 12);
      await db.collection('users').doc(email).set({
        email,
        password: passwordHash,
        name: 'CompuFest Head',
        role: 'Head',
        createdAt: new Date().toISOString()
      });
      console.log('✅ Seeded default user: admin@compufest.com / adminpassword');
    }
  } catch (err) {
    console.error('Error seeding default user:', err.message);
  }
};
seedDefaultUser();

// @POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name || !normalizedEmail || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (!['Head', 'Co-Head'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be Head or Co-Head' });
    }

    const userDoc = await db.collection('users').doc(normalizedEmail).get();
    if (userDoc.exists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(normalizedEmail).set(newUser);

    const token = generateToken(normalizedEmail);
    const userResponse = { ...newUser };
    delete userResponse.password;

    res.status(201)
      .cookie('token', token, getTokenCookieOptions())
      .json({
        success: true,
        token,
        user: userResponse,
      });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
};

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const userDoc = await db.collection('users').doc(normalizedEmail).get();
    if (!userDoc.exists) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = userDoc.data();
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(normalizedEmail);
    const userResponse = { ...user };
    delete userResponse.password;

    res.status(200)
      .cookie('token', token, getTokenCookieOptions())
      .json({
        success: true,
        token,
        user: userResponse,
      });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @GET /api/auth/me
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @POST /api/auth/logout
const logout = async (req, res) => {
  res.cookie('token', '', { ...getTokenCookieOptions(), expires: new Date(0) });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
  signup,
  login,
  getMe,
  logout,
};
