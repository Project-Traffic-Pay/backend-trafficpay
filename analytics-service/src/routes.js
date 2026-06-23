const express = require('express');
const router = express.Router();
const { getAllFines, getAllPayments, getDistricts, getCategories } = require('./data-client');
const { authenticateToken, requireRole } = require('./middleware');

router.use(authenticateToken);
router.use(requireRole(['admin']));

// GET /api/analytics/summary
// Returns: { success, summary: { totalFines, paidCount, pendingCount, totalRevenue, pendingRevenue, collectionRatePercentage, smsSentCount } }
router.get('/summary', async (req, res) => {
  try {
    const fines = await getAllFines();
    const payments = await getAllPayments();

    const totalFines = fines.length;
    const paidCount = fines.filter(f => f.status === 'paid').length;
    const pendingCount = fines.filter(f => f.status === 'pending').length;
    const totalRevenue = payments.filter(p => p.status === 'success').reduce((s, p) => s + p.amount, 0);
    const pendingRevenue = fines.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0);
    const collectionRatePercentage = totalFines > 0 ? Math.round((paidCount / totalFines) * 100) : 0;

    res.json({
      success: true,
      summary: {
        totalFines,
        paidCount,
        pendingCount,
        totalRevenue,
        pendingRevenue,
        collectionRatePercentage,
        smsSentCount: payments.filter(p => p.status === 'success').length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Analytics error' });
  }
});

// GET /api/analytics/by-district
// Returns: { success, breakdown: [{ districtCode, districtName, totalRevenue, fineCount, paidCount }] }
router.get('/by-district', async (req, res) => {
  try {
    const fines = await getAllFines();
    const districts = await getDistricts();

    const breakdown = districts
      .map(d => {
        const distFines = fines.filter(f => f.districtId === d.id);
        const paidFines = distFines.filter(f => f.status === 'paid');
        return {
          districtCode: d.code,
          districtName: d.name,
          fineCount: distFines.length,
          paidCount: paidFines.length,
          totalRevenue: paidFines.reduce((s, f) => s + f.amount, 0)
        };
      })
      .filter(d => d.fineCount > 0);

    res.json({ success: true, breakdown });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Analytics error' });
  }
});

// GET /api/analytics/by-category
// Returns: { success, breakdown: [{ categoryCode, categoryName, totalRevenue, fineCount }] }
router.get('/by-category', async (req, res) => {
  try {
    const fines = await getAllFines();
    const categories = await getCategories();

    const breakdown = categories
      .map(c => {
        const catFines = fines.filter(f => f.categoryCode === c.code);
        const paidFines = catFines.filter(f => f.status === 'paid');
        return {
          categoryCode: c.code,
          categoryName: c.name,
          fineCount: catFines.length,
          totalRevenue: paidFines.reduce((s, f) => s + f.amount, 0)
        };
      })
      .filter(c => c.fineCount > 0);

    res.json({ success: true, breakdown });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Analytics error' });
  }
});

// GET /api/analytics/transactions
// Returns: { success, transactions: [...fine records enriched with payment info] }
router.get('/transactions', async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;
    const fines = await getAllFines();
    const payments = await getAllPayments();
    const districts = await getDistricts();
    const categories = await getCategories();

    const districtMap = Object.fromEntries(districts.map(d => [d.id, d]));
    const categoryMap = Object.fromEntries(categories.map(c => [c.code, c]));
    const paymentMap = Object.fromEntries(payments.map(p => [p.referenceNumber, p]));

    let transactions = fines.map(f => {
      const payment = paymentMap[f.referenceNumber];
      const district = districtMap[f.districtId] || {};
      const category = categoryMap[f.categoryCode] || {};
      return {
        fineId: f.id,
        referenceNumber: f.referenceNumber,
        categoryCode: f.categoryCode,
        categoryName: category.name || f.categoryCode,
        driverName: f.driverName,
        driverNic: f.driverNic,
        vehicleNumber: f.vehicleNumber,
        districtName: district.name || f.districtId,
        amount: f.amount,
        status: f.status,
        officerName: f.officerName,
        officerBadge: f.issuingOfficerId,
        createdAt: f.createdAt,
        paidAt: f.paidAt || null,
        transactionId: payment ? payment.transactionId : null,
        smsStatus: 'sent'
      };
    });

    // Filter
    if (status) transactions = transactions.filter(t => t.status === status);
    if (search) {
      const q = search.toLowerCase();
      transactions = transactions.filter(t =>
        t.referenceNumber.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        t.vehicleNumber.toLowerCase().includes(q) ||
        t.driverNic.toLowerCase().includes(q)
      );
    }

    // Most recent first
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Analytics error' });
  }
});

module.exports = router;