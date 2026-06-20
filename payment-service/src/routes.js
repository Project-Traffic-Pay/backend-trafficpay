const express = require('express');
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
    const fineRes = await fetch(`http://localhost:5002/api/fines/lookup?ref=${referenceNumber}${category ? '&category='+category : ''}`);
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
      description: `Payment for Fine ${fine.referenceNumber}`,
      referenceNumber,
      cardNumber
    });

    if (session.payment_status === 'paid') {
      await fetch(`http://localhost:5002/api/fines/${fine.id}/mark-paid`, { method: 'PATCH' });

      if (fine.officerPhone) {
        const msg = `[SL Police TrafficPay] Fine ${fine.referenceNumber} (LKR ${fine.amount}) has been PAID. Release driver license.`;
        await fetch('http://localhost:5004/api/notifications/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ officerPhone: fine.officerPhone, message: msg, fineId: fine.id, referenceNumber: fine.referenceNumber })
        }).catch(err => console.error('Failed to notify:', err));
      }

      const db = loadData();
      const newPayment = {
        id: `PAY-${Date.now().toString().slice(-4)}`,
        fineId: fine.id,
        referenceNumber: fine.referenceNumber,
        transactionId: `TXN-${Date.now()}`,
        stripeSessionId: session.id,
        amount: fine.amount,
        paymentMethod: cardNumber ? `Card ending in ${cardNumber.slice(-4)}` : 'Card',
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

module.exports = router;