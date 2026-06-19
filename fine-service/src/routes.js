const express = require('express');
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
    id: `FINE-${Date.now().toString().slice(-4)}`,
    referenceNumber: `SLP-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`,
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

module.exports = router;