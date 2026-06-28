function createCheckoutSession({ amount, currency, description, referenceNumber, cardNumber }) {
  const failed = cardNumber && cardNumber.toUpperCase().includes('FAIL');
  const sessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const paymentIntentId = `pi_mock_${Math.random().toString(36).slice(2,12)}`;
  
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
module.exports = { createCheckoutSession };