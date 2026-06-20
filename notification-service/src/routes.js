const express = require('express');
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
    id: `SMS-${Date.now().toString().slice(-4)}`,
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

module.exports = router;