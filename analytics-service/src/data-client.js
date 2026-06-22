const FINE_URL = 'http://localhost:5002';
const PAYMENT_URL = 'http://localhost:5003';

async function getAllFines() {
  try {
    const r = await fetch(`${FINE_URL}/api/fines/all`);
    const d = await r.json();
    return d.fines || [];
  } catch (e) {
    console.error('Failed to fetch fines', e);
    return [];
  }
}
async function getAllPayments() {
  try {
    const r = await fetch(`${PAYMENT_URL}/api/payments`);
    const d = await r.json();
    return d.payments || [];
  } catch (e) {
    console.error('Failed to fetch payments', e);
    return [];
  }
}
async function getDistricts() {
  try {
    const r = await fetch(`${FINE_URL}/api/fines/districts`);
    const d = await r.json();
    return d.districts || [];
  } catch (e) {
    console.error('Failed to fetch districts', e);
    return [];
  }
}
async function getCategories() {
  try {
    const r = await fetch(`${FINE_URL}/api/fines/categories`);
    const d = await r.json();
    return d.categories || [];
  } catch (e) {
    console.error('Failed to fetch categories', e);
    return [];
  }
}
module.exports = { getAllFines, getAllPayments, getDistricts, getCategories };