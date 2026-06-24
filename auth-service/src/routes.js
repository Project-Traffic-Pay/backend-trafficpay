const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { loadData, saveData } = require('./db');
const { JWT_SECRET, JWT_REFRESH, authenticateToken } = require('./middleware');

router.post('/register', (req, res) => {
  const { name, email, password, role, badgeNumber, districtId, phoneNumber } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  const db = loadData();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'User with this email already exists.' });
  }

  const userRole = role === 'admin' ? 'admin' : 'officer';
  const newUser = {
    id: `USR-${Date.now().toString().slice(-6)}`,
    name, email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: userRole,
    badgeNumber: badgeNumber || (userRole === 'admin' ? 'ADM-99' : 'PS-000'),
    districtId: districtId || 'DIS-01',
    phoneNumber: phoneNumber || '+94770000000',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveData(db);

  const payload = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, districtId: newUser.districtId, phoneNumber: newUser.phoneNumber };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH, { expiresIn: '7d' });

  return res.status(201).json({ success: true, message: 'User registered successfully.', user: payload, tokens: { accessToken, refreshToken } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const db = loadData();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, badgeNumber: user.badgeNumber, districtId: user.districtId, phoneNumber: user.phoneNumber };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH, { expiresIn: '7d' });

  return res.json({ success: true, message: 'Login successful.', user: payload, tokens: { accessToken, refreshToken } });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token is required.' });

  jwt.verify(refreshToken, JWT_REFRESH, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, badgeNumber: user.badgeNumber, districtId: user.districtId, phoneNumber: user.phoneNumber };
    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ success: true, tokens: { accessToken: newAccessToken } });
  });
});

router.get('/me', authenticateToken, (req, res) => {
  const db = loadData();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  const { passwordHash, ...userWithoutPassword } = user;
  return res.json({ success: true, user: userWithoutPassword });
});

module.exports = router;