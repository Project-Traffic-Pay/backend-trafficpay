const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get SMS logs audit trail (FR-9)
router.get('/logs', authenticateToken, requireRole(['admin', 'officer']), async (req, res) => {
  let query = supabase.from('sms_logs').select('*');

  if (req.user.role === 'officer') {
    query = query.eq('officer_phone', req.user.phoneNumber);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  // Map to camelCase
  const logs = data.map(l => ({
    id: l.id,
    fineId: l.fine_id,
    referenceNumber: l.reference_number,
    officerPhone: l.officer_phone,
    message: l.message,
    status: l.status,
    timestamp: l.created_at
  }));

  res.json({ success: true, count: logs.length, logs });
});

// Manual trigger / test endpoint for SMS gateway
router.post('/send-sms', authenticateToken, async (req, res) => {
  const { fineId, officerPhone, message, referenceNumber } = req.body;

  if (!officerPhone || !message) {
    return res.status(400).json({ success: false, message: 'officerPhone and message are required.' });
  }

  const smsLog = {
    id: `SMS-${Date.now().toString().slice(-6)}`,
    fine_id: fineId || 'MANUAL',
    reference_number: referenceNumber || 'N/A',
    officer_phone: officerPhone,
    message,
    status: 'sent',
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('sms_logs').insert([smsLog]);
  if (error) return res.status(500).json({ success: false, message: error.message });

  const responseLog = {
    ...smsLog,
    fineId: smsLog.fine_id,
    referenceNumber: smsLog.reference_number,
    officerPhone: smsLog.officer_phone,
    timestamp: smsLog.created_at
  };

  res.json({ success: true, message: 'SMS dispatched successfully via Notify.lk Gateway.', smsLog: responseLog });
});

module.exports = router;
