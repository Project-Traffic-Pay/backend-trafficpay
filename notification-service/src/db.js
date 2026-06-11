const fs = require('fs');
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

module.exports = { loadData, saveData };