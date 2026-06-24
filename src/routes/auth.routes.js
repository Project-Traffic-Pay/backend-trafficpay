const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('../db');
const { JWT_SECRET, JWT_REFRESH_SECRET, authenticateToken } = require('../middleware/auth');

// Register endpoint
router.post('/register', async (req, res) => {
  const { name, email, password, role, badgeNumber, districtId, phoneNumber } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  // Check existing user
  const { data: existingUser } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'User with this email already exists.' });
  }

  const userRole = role === 'admin' ? 'admin' : 'officer';
  const newUser = {
    id: `USR-${Date.now().toString().slice(-6)}`,
    name,
    email: email.toLowerCase(),
    password_hash: bcrypt.hashSync(password, 10),
    role: userRole,
    badge_number: badgeNumber || (userRole === 'admin' ? 'ADM-99' : 'PS-000'),
    district_id: districtId || 'DIS-01',
    phone_number: phoneNumber || '+94770000000'
  };

  const { error } = await supabase.from('users').insert([newUser]);
  if (error) return res.status(500).json({ success: false, message: error.message });

  const payload = { 
    id: newUser.id, 
    name: newUser.name, 
    email: newUser.email, 
    role: newUser.role, 
    districtId: newUser.district_id 
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    user: payload,
    tokens: { accessToken, refreshToken }
  });
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const { data: user, error } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();

  if (error || !user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    badgeNumber: user.badge_number,
    districtId: user.district_id,
    phoneNumber: user.phone_number
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return res.json({
    success: true,
    message: 'Login successful.',
    user: payload,
    tokens: { accessToken, refreshToken }
  });
});

// Refresh token endpoint
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token is required.' });
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      badgeNumber: user.badgeNumber,
      districtId: user.districtId,
      phoneNumber: user.phoneNumber
    };

    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    return res.json({
      success: true,
      tokens: { accessToken: newAccessToken }
    });
  });
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  const { data: user, error } = await supabase.from('users').select('*').eq('id', req.user.id).maybeSingle();
  
  if (error || !user) return res.status(404).json({ success: false, message: 'User not found.' });
  
  const { password_hash, ...userWithoutPassword } = user;
  
  // Format to match old payload style (camelCase)
  const formattedUser = {
    id: userWithoutPassword.id,
    name: userWithoutPassword.name,
    email: userWithoutPassword.email,
    role: userWithoutPassword.role,
    badgeNumber: userWithoutPassword.badge_number,
    districtId: userWithoutPassword.district_id,
    phoneNumber: userWithoutPassword.phone_number
  };
  
  return res.json({ success: true, user: formattedUser });
});

module.exports = router;
