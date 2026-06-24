const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'traffic_pay_slp_secret_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'traffic_pay_slp_refresh_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Access token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired access token.' });
    }
    req.user = user;
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Forbidden. Role '${req.user.role}' is not authorized.` });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  authenticateToken,
  requireRole
};
