const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const activePaymentLocks = new Set();

router.post('/pay', async (req, res) => {
  const { referenceNumber, categoryCode, cardNumber, cardHolderName, expiryDate, cvv } = req.body;

  if (!referenceNumber || !categoryCode) {
    return res.status(400).json({ success: false, message: 'Reference number and category code are required.' });
  }

  // To process a real Stripe payment without a PaymentMethod from the frontend (which is the recommended way),
  // we can create a token using the raw card details if we are in test mode and the account allows it.
  if (!cardNumber || !expiryDate || !cvv) {
    return res.status(400).json({ success: false, message: 'Card details are required for payment.' });
  }

  const cleanRef = referenceNumber.trim().toUpperCase();
  const cleanCat = categoryCode.trim().toUpperCase();
  const lockKey = `${cleanRef}_${cleanCat}`;

  if (activePaymentLocks.has(lockKey)) {
    return res.status(409).json({ success: false, message: 'A payment transaction is currently processing. Please wait.' });
  }

  activePaymentLocks.add(lockKey);

  try {
    const { data: targetFine, error: fineError } = await supabase
      .from('fines')
      .select('*, users(name, phone_number)')
      .eq('reference_number', cleanRef)
      .eq('category_code', cleanCat)
      .maybeSingle();

    if (fineError || !targetFine) {
      activePaymentLocks.delete(lockKey);
      return res.status(404).json({ success: false, message: `Fine record with Ref #${cleanRef} and Category ${cleanCat} was not found.` });
    }

    if (targetFine.status === 'paid') {
      activePaymentLocks.delete(lockKey);
      return res.status(400).json({ success: false, message: `Fine has already been paid. Double payment is not permitted.` });
    }

    const isSimulatedFailure = (cardNumber && cardNumber.toUpperCase().includes('FAIL')) ||
                               (cardHolderName && cardHolderName.toUpperCase().includes('FAIL'));

    if (isSimulatedFailure) {
      const failedPayment = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        fine_id: targetFine.id,
        reference_number: targetFine.reference_number,
        transaction_id: `TXN-FAILED-${Date.now().toString().slice(-6)}`,
        amount: targetFine.amount,
        payment_method: 'Card (Payment Declined)',
        status: 'failed'
      };
      await supabase.from('payments').insert([failedPayment]);

      activePaymentLocks.delete(lockKey);
      return res.status(400).json({ success: false, message: 'Payment declined by card issuing bank.' });
    }

    // Attempt Stripe Charge
    let charge;
    try {
      // 1. Determine token (Test Mode Only)
      let sourceToken = 'tok_visa'; // default test token
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.startsWith('5')) {
        sourceToken = 'tok_mastercard';
      } else if (cleanCard.startsWith('3')) {
        sourceToken = 'tok_amex';
      }

      // 2. Create the charge
      charge = await stripe.charges.create({
        amount: Math.round(targetFine.amount * 100), // Stripe expects amount in cents/smallest currency unit
        currency: 'lkr',
        source: sourceToken,
        description: `Fine Payment - ${targetFine.reference_number}`,
        metadata: {
          fineId: targetFine.id,
          referenceNumber: targetFine.reference_number
        }
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      
      const failedPayment = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        fine_id: targetFine.id,
        reference_number: targetFine.reference_number,
        transaction_id: `TXN-FAILED-${Date.now().toString().slice(-6)}`,
        amount: targetFine.amount,
        payment_method: `Card ending in ${cardNumber ? cardNumber.slice(-4) : '4242'}`,
        status: 'failed'
      };
      await supabase.from('payments').insert([failedPayment]);
      
      activePaymentLocks.delete(lockKey);
      return res.status(400).json({ success: false, message: `Payment failed: ${stripeError.message}` });
    }

    const paymentTimestamp = new Date().toISOString();
    const transactionId = charge.id; // Use real Stripe Charge ID

    // Update Fine
    const { error: updateError } = await supabase
      .from('fines')
      .update({ status: 'paid', paid_at: paymentTimestamp })
      .eq('id', targetFine.id);

    if (updateError) throw updateError;

    // Record Payment
    const newPayment = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      fine_id: targetFine.id,
      reference_number: targetFine.reference_number,
      transaction_id: transactionId,
      amount: targetFine.amount,
      payment_method: `Stripe - Card ending in ${charge.payment_method_details.card.last4}`,
      status: 'success'
    };
    await supabase.from('payments').insert([newPayment]);

    // SMS Log
    const officerName = targetFine.users ? targetFine.users.name : 'Issuing Officer';
    const officerPhone = targetFine.users ? targetFine.users.phone_number : '+94771234567';
    const smsMessage = `[SL Police Traffic Pay] ALERT: Fine ${targetFine.reference_number} (LKR ${targetFine.amount.toLocaleString()}) for vehicle ${targetFine.vehicle_number} has been PAID in full (Txn: ${transactionId}). You may release driver license NIC: ${targetFine.driver_nic}.`;

    const smsLog = {
      id: `SMS-${Date.now().toString().slice(-6)}`,
      fine_id: targetFine.id,
      reference_number: targetFine.reference_number,
      officer_phone: officerPhone,
      message: smsMessage,
      status: 'sent'
    };
    await supabase.from('sms_logs').insert([smsLog]);

    activePaymentLocks.delete(lockKey);

    return res.json({
      success: true,
      message: 'Payment confirmed successfully via Stripe.',
      receipt: {
        transactionId,
        referenceNumber: targetFine.reference_number,
        categoryCode: targetFine.category_code,
        amount: targetFine.amount,
        driverName: targetFine.driver_name,
        driverNic: targetFine.driver_nic,
        vehicleNumber: targetFine.vehicle_number,
        paidAt: paymentTimestamp,
        smsStatus: 'sent',
        officerNotified: officerName
      }
    });
  } catch (error) {
    activePaymentLocks.delete(lockKey);
    console.error('Payment error:', error);
    return res.status(500).json({ success: false, message: 'Internal payment server error.' });
  }
});

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('payments').select('*');
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, count: data.length, payments: data });
});

module.exports = router;
