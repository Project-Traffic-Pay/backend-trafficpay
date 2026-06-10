const fs = require('fs');
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

module.exports = { loadData, saveData };