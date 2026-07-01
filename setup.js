const fs = require('fs');
const path = require('path');

const basePath = path.join('c:', 'Users', 'theek', 'OneDrive', 'Desktop', 'TrafficPay', 'backend');

const files = {
  'gateway/package.json': `{
  "name": "trafficpay-gateway",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "http-proxy-middleware": "^3.0.5"
  }
}`,
  'gateway/src/server.js': `const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

app.use((req, res, next) => {
  console.log(\`[Gateway] \${req.method} \${req.url}\`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      gateway: 'up',
      auth: 'http://localhost:5001',
      fines: 'http://localhost:5002',
      payments: 'http://localhost:5003',
      notifications: 'http://localhost:5004',
      analytics: 'http://localhost:5005'
    }
  });
});

app.use('/api/auth', createProxyMiddleware({ target: 'http://localhost:5001', changeOrigin: true }));
app.use('/api/fines', createProxyMiddleware({ target: 'http://localhost:5002', changeOrigin: true }));
app.use('/api/payments', createProxyMiddleware({ target: 'http://localhost:5003', changeOrigin: true }));
app.use('/api/notifications', createProxyMiddleware({ target: 'http://localhost:5004', changeOrigin: true }));
app.use('/api/analytics', createProxyMiddleware({ target: 'http://localhost:5005', changeOrigin: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(\`Gateway running on port \${PORT}\`);
});`,

  'auth-service/package.json': `{
  "name": "trafficpay-auth-service",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2"
  }
}`,
  'auth-service/src/db.js': `const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '..', 'data.json');

const defaultUsers = [
  {
    id: 'USR-001',
    name: 'Inspector S. Bandara',
    email: 'officer.bandara@police.lk',
    passwordHash: bcrypt.hashSync('officer123', 10),
    role: 'officer',
    badgeNumber: 'IP-88421',
    districtId: 'DIS-01',
    phoneNumber: '+94771234567'
  },
  {
    id: 'USR-002',
    name: 'Sergeant K. Perera',
    email: 'officer.perera@police.lk',
    passwordHash: bcrypt.hashSync('officer123', 10),
    role: 'officer',
    badgeNumber: 'PS-44120',
    districtId: 'DIS-02',
    phoneNumber: '+94779876543'
  },
  {
    id: 'USR-003',
    name: 'DIG Traffic N. Jayawardena',
    email: 'admin.traffic@police.lk',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    badgeNumber: 'DIG-001',
    districtId: 'DIS-01',
    phoneNumber: '+94710001122'
  }
];

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: defaultUsers };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    const initialData = { users: defaultUsers };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { loadData, saveData };`,
  'auth-service/src/middleware.js': `const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'traffic_pay_slp_secret_key_2026';
const JWT_REFRESH = process.env.JWT_REFRESH_SECRET || 'traffic_pay_slp_refresh_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { JWT_SECRET, JWT_REFRESH, authenticateToken, requireRole };`,
  'auth-service/src/routes.js': `const express = require('express');
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
    id: \`USR-\${Date.now().toString().slice(-6)}\`,
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

module.exports = router;`,
  'auth-service/src/server.js': `const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(\`[Auth] \${req.method} \${req.url}\`);
  next();
});

app.use('/api/auth', routes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(\`Auth Service running on port \${PORT}\`);
});`,

  'fine-service/package.json': `{
  "name": "trafficpay-fine-service",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2"
  }
}`,
  'fine-service/src/db.js': `const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data.json');

const defaultDistricts = [
  { id: 'DIS-01', name: 'Colombo Central', code: 'COL-C' },
  { id: 'DIS-02', name: 'Colombo South (Nugegoda)', code: 'COL-S' },
  { id: 'DIS-03', name: 'Gampaha', code: 'GAM' },
  { id: 'DIS-04', name: 'Kandy', code: 'KDY' },
  { id: 'DIS-05', name: 'Galle', code: 'GAL' },
  { id: 'DIS-06', name: 'Matara', code: 'MTR' },
  { id: 'DIS-07', name: 'Jaffna', code: 'JAF' },
  { id: 'DIS-08', name: 'Kurunegala', code: 'KUR' },
  { id: 'DIS-09', name: 'Anuradhapura', code: 'ANU' },
  { id: 'DIS-10', name: 'Badulla', code: 'BAD' }
];

const defaultCategories = [
  { id: 'CAT-01', code: 'SPD', name: 'Exceeding Speed Limit', amount: 3000, description: 'Driving above prescribed speed limit in designated zone' },
  { id: 'CAT-02', code: 'RLS', name: 'Traffic Signal Violation', amount: 2500, description: 'Disregarding red light or traffic police officer signal' },
  { id: 'CAT-03', code: 'DL', name: 'Driving Without License', amount: 5000, description: 'Operating motor vehicle without a valid driving license' },
  { id: 'CAT-04', code: 'INS', name: 'No Valid Revenue/Insurance', amount: 4000, description: 'Failure to produce valid insurance policy or revenue license' },
  { id: 'CAT-05', code: 'HLM', name: 'Helmet Violation', amount: 2000, description: 'Riding motorcycle without wearing standard protective helmet' },
  { id: 'CAT-06', code: 'SB', name: 'Seatbelt Non-Compliance', amount: 2000, description: 'Driver or front passenger not wearing seatbelt' },
  { id: 'CAT-07', code: 'DU', name: 'Driving Under Influence', amount: 10000, description: 'Driving under the influence of liquor or narcotic substances' },
  { id: 'CAT-08', code: 'MOB', name: 'Mobile Phone Usage', amount: 3500, description: 'Using hand-held mobile device while vehicle is in motion' },
  { id: 'CAT-09', code: 'PRK', name: 'Obstruction/Illegal Parking', amount: 1500, description: 'Parking in no-parking zone or causing public obstruction' },
  { id: 'CAT-10', code: 'EM', name: 'Emission Non-Compliance', amount: 2500, description: 'Operating vehicle exceeding permissible exhaust emission limits' }
];

const defaultFines = [
  {
    id: 'FINE-001',
    referenceNumber: 'SLP-2026-88101',
    categoryCode: 'SPD',
    driverNic: '199245100982',
    driverName: 'Kamal Silva',
    vehicleNumber: 'WP CAB-4521',
    amount: 3000,
    status: 'pending',
    issuingOfficerId: 'USR-001',
    officerPhone: '+94771234567',
    officerName: 'Inspector S. Bandara',
    districtId: 'DIS-01',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    paidAt: null
  },
  {
    id: 'FINE-002',
    referenceNumber: 'SLP-2026-99420',
    categoryCode: 'RLS',
    driverNic: '198812300411',
    driverName: 'Nimal Fernando',
    vehicleNumber: 'SP NW-8812',
    amount: 2500,
    status: 'paid',
    issuingOfficerId: 'USR-002',
    officerPhone: '+94779876543',
    officerName: 'Sergeant K. Perera',
    districtId: 'DIS-02',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    paidAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'FINE-003',
    referenceNumber: 'SLP-2026-10452',
    categoryCode: 'MOB',
    driverNic: '199588100123',
    driverName: 'Sunil Rathnayake',
    vehicleNumber: 'WP BJ-9910',
    amount: 3500,
    status: 'paid',
    issuingOfficerId: 'USR-001',
    officerPhone: '+94771234567',
    officerName: 'Inspector S. Bandara',
    districtId: 'DIS-01',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    paidAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'FINE-004',
    referenceNumber: 'SLP-2026-33910',
    categoryCode: 'DL',
    driverNic: '200104500998',
    driverName: 'Ruwan Dissanayake',
    vehicleNumber: 'CP CAR-1029',
    amount: 5000,
    status: 'pending',
    issuingOfficerId: 'USR-001',
    officerPhone: '+94771234567',
    officerName: 'Inspector S. Bandara',
    districtId: 'DIS-04',
    createdAt: new Date().toISOString(),
    paidAt: null
  }
];

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { districts: defaultDistricts, categories: defaultCategories, fines: defaultFines };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    const initialData = { districts: defaultDistricts, categories: defaultCategories, fines: defaultFines };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { loadData, saveData };`,
  'fine-service/src/middleware.js': `const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'traffic_pay_slp_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole };`,
  'fine-service/src/routes.js': `const express = require('express');
const router = express.Router();
const { loadData, saveData } = require('./db');
const { authenticateToken, requireRole } = require('./middleware');

router.get('/categories', (req, res) => {
  const db = loadData();
  res.json({ success: true, categories: db.categories });
});

router.get('/districts', (req, res) => {
  const db = loadData();
  res.json({ success: true, districts: db.districts });
});

router.get('/lookup', (req, res) => {
  const { ref, category } = req.query;
  if (!ref) return res.status(400).json({ success: false, message: 'Reference number is required.' });

  const db = loadData();
  const fine = db.fines.find(f => f.referenceNumber === ref);
  if (!fine) return res.status(404).json({ success: false, message: 'Fine not found.' });

  if (category && fine.categoryCode !== category) {
    return res.status(400).json({ success: false, message: 'Category does not match the fine record.' });
  }

  res.json({ success: true, fine });
});

router.get('/all', (req, res) => {
  const db = loadData();
  res.json({ success: true, fines: db.fines });
});

router.get('/', authenticateToken, (req, res) => {
  const db = loadData();
  let fines = db.fines;
  if (req.user.role === 'officer') {
    fines = fines.filter(f => f.issuingOfficerId === req.user.id);
  }
  res.json({ success: true, fines });
});

router.post('/', authenticateToken, requireRole(['officer', 'admin']), (req, res) => {
  const { categoryCode, driverNic, driverName, vehicleNumber, districtId } = req.body;
  if (!categoryCode || !driverNic || !driverName || !vehicleNumber || !districtId) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const db = loadData();
  const category = db.categories.find(c => c.code === categoryCode);
  if (!category) return res.status(400).json({ success: false, message: 'Invalid category code.' });

  const newFine = {
    id: \`FINE-\${Date.now().toString().slice(-4)}\`,
    referenceNumber: \`SLP-\${new Date().getFullYear()}-\${Math.floor(Math.random() * 90000) + 10000}\`,
    categoryCode,
    driverNic,
    driverName,
    vehicleNumber,
    amount: category.amount,
    status: 'pending',
    issuingOfficerId: req.user.id,
    officerPhone: req.user.phoneNumber,
    officerName: req.user.name,
    districtId,
    createdAt: new Date().toISOString(),
    paidAt: null
  };

  db.fines.push(newFine);
  saveData(db);

  res.status(201).json({ success: true, message: 'Fine issued successfully.', fine: newFine });
});

router.patch('/:id/mark-paid', (req, res) => {
  // Simple internal endpoint, in real world needs security
  const { id } = req.params;
  const db = loadData();
  const fine = db.fines.find(f => f.id === id);
  if (!fine) return res.status(404).json({ success: false, message: 'Fine not found' });
  
  if (fine.status !== 'paid') {
    fine.status = 'paid';
    fine.paidAt = new Date().toISOString();
    saveData(db);
  }
  res.json({ success: true, fine });
});

module.exports = router;`,
  'fine-service/src/server.js': `const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(\`[Fine] \${req.method} \${req.url}\`);
  next();
});

app.use('/api/fines', routes);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(\`Fine Service running on port \${PORT}\`);
});`,

  'payment-service/package.json': `{
  "name": "trafficpay-payment-service",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2"
  }
}`,
  'payment-service/src/stripe-mock.js': `function createCheckoutSession({ amount, currency, description, referenceNumber, cardNumber }) {
  const failed = cardNumber && cardNumber.toUpperCase().includes('FAIL');
  const sessionId = \`cs_mock_\${Date.now()}_\${Math.random().toString(36).slice(2,8)}\`;
  const paymentIntentId = \`pi_mock_\${Math.random().toString(36).slice(2,12)}\`;
  
  return {
    id: sessionId,
    object: 'checkout.session',
    payment_intent: paymentIntentId,
    amount_total: amount,
    currency: currency || 'lkr',
    payment_status: failed ? 'unpaid' : 'paid',
    status: failed ? 'expired' : 'complete',
    metadata: { referenceNumber, description },
    created: Math.floor(Date.now() / 1000)
  };
}
module.exports = { createCheckoutSession };`,
  'payment-service/src/db.js': `const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data.json');

const defaultPayments = [
  { id: 'PAY-001', fineId: 'FINE-002', referenceNumber: 'SLP-2026-99420', transactionId: 'TXN-9841208941', stripeSessionId: 'cs_mock_seed_001', amount: 2500, paymentMethod: 'Card ending in 4242', status: 'success', createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 'PAY-002', fineId: 'FINE-003', referenceNumber: 'SLP-2026-10452', transactionId: 'TXN-7741290311', stripeSessionId: 'cs_mock_seed_002', amount: 3500, paymentMethod: 'Card ending in 8812', status: 'success', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() }
];

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { payments: defaultPayments };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    const initialData = { payments: defaultPayments };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { loadData, saveData };`,
  'payment-service/src/routes.js': `const express = require('express');
const router = express.Router();
const { loadData, saveData } = require('./db');
const { createCheckoutSession } = require('./stripe-mock');

const locks = new Set();

router.post('/pay', async (req, res) => {
  const { referenceNumber, category, cardNumber } = req.body;
  
  if (!referenceNumber) return res.status(400).json({ success: false, message: 'referenceNumber required' });
  
  if (locks.has(referenceNumber)) {
    return res.status(409).json({ success: false, message: 'Payment is already processing for this fine' });
  }
  locks.add(referenceNumber);

  try {
    const fineRes = await fetch(\`http://localhost:5002/api/fines/lookup?ref=\${referenceNumber}\${category ? '&category='+category : ''}\`);
    const fineData = await fineRes.json();
    
    if (!fineData.success) {
      locks.delete(referenceNumber);
      return res.status(404).json(fineData);
    }
    
    const fine = fineData.fine;
    if (fine.status === 'paid') {
      locks.delete(referenceNumber);
      return res.status(400).json({ success: false, message: 'Fine is already paid' });
    }

    const session = createCheckoutSession({
      amount: fine.amount,
      currency: 'lkr',
      description: \`Payment for Fine \${fine.referenceNumber}\`,
      referenceNumber,
      cardNumber
    });

    if (session.payment_status === 'paid') {
      await fetch(\`http://localhost:5002/api/fines/\${fine.id}/mark-paid\`, { method: 'PATCH' });

      if (fine.officerPhone) {
        const msg = \`[SL Police TrafficPay] Fine \${fine.referenceNumber} (LKR \${fine.amount}) has been PAID. Release driver license.\`;
        await fetch('http://localhost:5004/api/notifications/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ officerPhone: fine.officerPhone, message: msg, fineId: fine.id, referenceNumber: fine.referenceNumber })
        }).catch(err => console.error('Failed to notify:', err));
      }

      const db = loadData();
      const newPayment = {
        id: \`PAY-\${Date.now().toString().slice(-4)}\`,
        fineId: fine.id,
        referenceNumber: fine.referenceNumber,
        transactionId: \`TXN-\${Date.now()}\`,
        stripeSessionId: session.id,
        amount: fine.amount,
        paymentMethod: cardNumber ? \`Card ending in \${cardNumber.slice(-4)}\` : 'Card',
        status: 'success',
        createdAt: new Date().toISOString()
      };
      db.payments.push(newPayment);
      saveData(db);

      locks.delete(referenceNumber);
      return res.json({ success: true, message: 'Payment successful', receipt: newPayment });
    } else {
      locks.delete(referenceNumber);
      return res.status(400).json({ success: false, message: 'Payment failed' });
    }
  } catch (err) {
    locks.delete(referenceNumber);
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/', (req, res) => {
  const db = loadData();
  res.json({ success: true, payments: db.payments });
});

module.exports = router;`,
  'payment-service/src/server.js': `const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(\`[Payment] \${req.method} \${req.url}\`);
  next();
});

app.use('/api/payments', routes);

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(\`Payment Service running on port \${PORT}\`);
});`,

  'notification-service/package.json': `{
  "name": "trafficpay-notification-service",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2"
  }
}`,
  'notification-service/.env': `PORT=5004
NOTIFY_USER_ID=32480
NOTIFY_API_KEY=gKTbMu8Atz8iNMpWQFti
NOTIFY_SENDER_ID=NotifyDEMO
JWT_SECRET=traffic_pay_slp_secret_key_2026`,
  'notification-service/src/notify-lk.js': `async function sendSms({ to, message }) {
  const userId = process.env.NOTIFY_USER_ID;
  const apiKey = process.env.NOTIFY_API_KEY;
  const senderId = process.env.NOTIFY_SENDER_ID || 'NotifyDEMO';
  
  let phone = String(to).replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '94' + phone.slice(1);
  if (!phone.startsWith('94')) phone = '94' + phone;
  
  if (!userId || !apiKey) {
    console.log('[NotifyLK] Demo mode - SMS not sent. Configure NOTIFY_USER_ID and NOTIFY_API_KEY');
    return { status: 'demo_mode', message: 'No credentials configured' };
  }
  
  const params = new URLSearchParams({ user_id: userId, api_key: apiKey, sender_id: senderId, to: phone, message });
  try {
    const response = await fetch(\`https://app.notify.lk/api/v1/send?\${params}\`);
    const data = await response.json();
    console.log('[NotifyLK] SMS result:', data);
    return data;
  } catch (err) {
    console.error('[NotifyLK] Error:', err);
    return { status: 'error', error: err.message };
  }
}
module.exports = { sendSms };`,
  'notification-service/src/db.js': `const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data.json');

const defaultSmsLogs = [
  { id: 'SMS-001', fineId: 'FINE-002', referenceNumber: 'SLP-2026-99420', officerPhone: '+94779876543', message: '[SL Police TrafficPay] Fine SLP-2026-99420 (LKR 2500) has been PAID. Release driver license.', status: 'sent', notifyResponse: { status: 'success' }, timestamp: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 'SMS-002', fineId: 'FINE-003', referenceNumber: 'SLP-2026-10452', officerPhone: '+94771234567', message: '[SL Police TrafficPay] Fine SLP-2026-10452 (LKR 3500) has been PAID. Release driver license.', status: 'sent', notifyResponse: { status: 'success' }, timestamp: new Date(Date.now() - 3600000 * 4).toISOString() }
];

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { smsLogs: defaultSmsLogs };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    const initialData = { smsLogs: defaultSmsLogs };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { loadData, saveData };`,
  'notification-service/src/middleware.js': `const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'traffic_pay_slp_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };`,
  'notification-service/src/routes.js': `const express = require('express');
const router = express.Router();
const { loadData, saveData } = require('./db');
const { sendSms } = require('./notify-lk');
const { authenticateToken } = require('./middleware');

router.post('/send-sms', async (req, res) => {
  const { officerPhone, message, fineId, referenceNumber } = req.body;
  if (!officerPhone || !message) {
    return res.status(400).json({ success: false, message: 'Phone and message required' });
  }

  const result = await sendSms({ to: officerPhone, message });
  
  const db = loadData();
  const log = {
    id: \`SMS-\${Date.now().toString().slice(-4)}\`,
    fineId, referenceNumber, officerPhone, message,
    status: result.status === 'success' || result.status === 'demo_mode' ? 'sent' : 'failed',
    notifyResponse: result,
    timestamp: new Date().toISOString()
  };
  db.smsLogs.push(log);
  saveData(db);

  res.json({ success: true, log });
});

router.get('/logs', authenticateToken, (req, res) => {
  const db = loadData();
  res.json({ success: true, smsLogs: db.smsLogs });
});

module.exports = router;`,
  'notification-service/src/server.js': `const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(\`[Notification] \${req.method} \${req.url}\`);
  next();
});

app.use('/api/notifications', routes);

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log(\`Notification Service running on port \${PORT}\`);
});`,

  'analytics-service/package.json': `{
  "name": "trafficpay-analytics-service",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2"
  }
}`,
  'analytics-service/src/data-client.js': `const FINE_URL = 'http://localhost:5002';
const PAYMENT_URL = 'http://localhost:5003';

async function getAllFines() {
  try {
    const r = await fetch(\`\${FINE_URL}/api/fines/all\`);
    const d = await r.json();
    return d.fines || [];
  } catch (e) {
    console.error('Failed to fetch fines', e);
    return [];
  }
}
async function getAllPayments() {
  try {
    const r = await fetch(\`\${PAYMENT_URL}/api/payments\`);
    const d = await r.json();
    return d.payments || [];
  } catch (e) {
    console.error('Failed to fetch payments', e);
    return [];
  }
}
async function getDistricts() {
  try {
    const r = await fetch(\`\${FINE_URL}/api/fines/districts\`);
    const d = await r.json();
    return d.districts || [];
  } catch (e) {
    console.error('Failed to fetch districts', e);
    return [];
  }
}
async function getCategories() {
  try {
    const r = await fetch(\`\${FINE_URL}/api/fines/categories\`);
    const d = await r.json();
    return d.categories || [];
  } catch (e) {
    console.error('Failed to fetch categories', e);
    return [];
  }
}
module.exports = { getAllFines, getAllPayments, getDistricts, getCategories };`,
  'analytics-service/src/middleware.js': `const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'traffic_pay_slp_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole };`,
  'analytics-service/src/routes.js': `const express = require('express');
const router = express.Router();
const { getAllFines, getAllPayments, getDistricts, getCategories } = require('./data-client');
const { authenticateToken, requireRole } = require('./middleware');

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/summary', async (req, res) => {
  const fines = await getAllFines();
  const payments = await getAllPayments();

  const totalFines = fines.length;
  const pendingFines = fines.filter(f => f.status === 'pending').length;
  const paidFines = fines.filter(f => f.status === 'paid').length;
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  res.json({
    success: true,
    data: { totalFines, pendingFines, paidFines, totalRevenue }
  });
});

router.get('/by-district', async (req, res) => {
  const fines = await getAllFines();
  const districts = await getDistricts();

  const districtData = districts.map(d => {
    const distFines = fines.filter(f => f.districtId === d.id);
    return {
      districtId: d.id,
      name: d.name,
      totalFines: distFines.length,
      revenue: distFines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
    };
  });

  res.json({ success: true, data: districtData });
});

router.get('/by-category', async (req, res) => {
  const fines = await getAllFines();
  const categories = await getCategories();

  const categoryData = categories.map(c => {
    const catFines = fines.filter(f => f.categoryCode === c.code);
    return {
      categoryCode: c.code,
      name: c.name,
      count: catFines.length,
      revenue: catFines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
    };
  });

  res.json({ success: true, data: categoryData });
});

router.get('/transactions', async (req, res) => {
  const payments = await getAllPayments();
  const recent = payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
  res.json({ success: true, data: recent });
});

module.exports = router;`,
  'analytics-service/src/server.js': `const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(\`[Analytics] \${req.method} \${req.url}\`);
  next();
});

app.use('/api/analytics', routes);

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(\`Analytics Service running on port \${PORT}\`);
});`
};

for (const [relPath, content] of Object.entries(files)) {
  const absPath = path.join(basePath, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
}
console.log('All files created successfully');
