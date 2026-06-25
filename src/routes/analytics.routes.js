const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper to apply date filters to Supabase query
function applyDateFilters(query, startDate, endDate, dateColumn = 'created_at') {
  if (startDate) {
    query = query.gte(dateColumn, new Date(startDate).toISOString());
  }
  if (endDate) {
    const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
    query = query.lte(dateColumn, new Date(endTimestamp).toISOString());
  }
  return query;
}

// Nationwide Collections & Stats Overview (FR-10, FR-22, FR-25)
router.get('/summary', authenticateToken, requireRole(['admin', 'officer']), async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = supabase.from('fines').select('amount, status');
  query = applyDateFilters(query, startDate, endDate);
  
  const { data: fines, error: finesError } = await query;
  if (finesError) return res.status(500).json({ success: false, message: finesError.message });

  const totalFines = fines.length;
  const paidFines = fines.filter(f => f.status === 'paid');
  const pendingFines = fines.filter(f => f.status === 'pending');

  const totalRevenue = paidFines.reduce((sum, f) => sum + Number(f.amount), 0);
  const pendingRevenue = pendingFines.reduce((sum, f) => sum + Number(f.amount), 0);
  
  let smsQuery = supabase.from('sms_logs').select('id, status').eq('status', 'sent');
  smsQuery = applyDateFilters(smsQuery, startDate, endDate);
  const { data: smsLogs, error: smsError } = await smsQuery;
  const smsSuccessCount = smsError ? 0 : smsLogs.length;

  res.json({
    success: true,
    filter: { startDate: startDate || null, endDate: endDate || null },
    summary: {
      totalRevenue,
      pendingRevenue,
      totalFines,
      paidCount: paidFines.length,
      pendingCount: pendingFines.length,
      smsSentCount: smsSuccessCount,
      collectionRatePercentage: totalFines > 0 ? ((paidFines.length / totalFines) * 100).toFixed(1) : '0.0'
    }
  });
});

// District-wise Breakdown (FR-10, FR-23, FR-25)
router.get('/by-district', authenticateToken, requireRole(['admin', 'officer']), async (req, res) => {
  const { startDate, endDate } = req.query;

  const { data: districts } = await supabase.from('districts').select('*');
  let query = supabase.from('fines').select('amount, status, district_id');
  query = applyDateFilters(query, startDate, endDate);
  const { data: fines } = await query;

  const districtMap = {};
  (districts || []).forEach(d => {
    districtMap[d.id] = {
      districtId: d.id,
      districtName: d.name,
      districtCode: d.code,
      totalRevenue: 0,
      totalFines: 0,
      paidCount: 0,
      pendingCount: 0
    };
  });

  (fines || []).forEach(fine => {
    const dId = fine.district_id || 'DIS-01';
    if (!districtMap[dId]) {
      districtMap[dId] = { districtId: dId, districtName: 'Unknown', districtCode: 'UNK', totalRevenue: 0, totalFines: 0, paidCount: 0, pendingCount: 0 };
    }

    districtMap[dId].totalFines += 1;
    if (fine.status === 'paid') {
      districtMap[dId].paidCount += 1;
      districtMap[dId].totalRevenue += Number(fine.amount);
    } else {
      districtMap[dId].pendingCount += 1;
    }
  });

  const districtData = Object.values(districtMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

  res.json({ success: true, breakdown: districtData });
});

// Category-wise Breakdown (FR-10, FR-24, FR-25)
router.get('/by-category', authenticateToken, requireRole(['admin', 'officer']), async (req, res) => {
  const { startDate, endDate } = req.query;

  const { data: categories } = await supabase.from('categories').select('*');
  let query = supabase.from('fines').select('amount, status, category_code');
  query = applyDateFilters(query, startDate, endDate);
  const { data: fines } = await query;

  const categoryMap = {};
  (categories || []).forEach(c => {
    categoryMap[c.code] = {
      categoryCode: c.code,
      categoryName: c.name,
      fineAmount: Number(c.amount),
      totalRevenue: 0,
      totalFines: 0,
      paidCount: 0,
      pendingCount: 0
    };
  });

  (fines || []).forEach(fine => {
    const cCode = fine.category_code.toUpperCase();
    if (!categoryMap[cCode]) {
      categoryMap[cCode] = { categoryCode: cCode, categoryName: cCode, fineAmount: Number(fine.amount), totalRevenue: 0, totalFines: 0, paidCount: 0, pendingCount: 0 };
    }

    categoryMap[cCode].totalFines += 1;
    if (fine.status === 'paid') {
      categoryMap[cCode].paidCount += 1;
      categoryMap[cCode].totalRevenue += Number(fine.amount);
    } else {
      categoryMap[cCode].pendingCount += 1;
    }
  });

  const categoryData = Object.values(categoryMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

  res.json({ success: true, breakdown: categoryData });
});

// Raw Transaction Drill-down (Open Question 4 raw drill requirement)
router.get('/transactions', authenticateToken, requireRole(['admin', 'officer']), async (req, res) => {
  const { startDate, endDate, search, status } = req.query;

  let query = supabase.from('fines').select(`
    *,
    categories(name),
    districts(name, code),
    users(name, badge_number),
    payments(payment_method, transaction_id),
    sms_logs(status, created_at)
  `);

  query = applyDateFilters(query, startDate, endDate);

  if (status) {
    query = query.eq('status', status.toLowerCase());
  }

  if (search) {
    const s = `%${search}%`;
    query = query.or(`reference_number.ilike.${s},driver_name.ilike.${s},driver_nic.ilike.${s},vehicle_number.ilike.${s},category_code.ilike.${s}`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  const enrichedTransactions = data.map(f => {
    const payment = f.payments && f.payments.length > 0 ? f.payments[0] : null;
    const sms = f.sms_logs && f.sms_logs.length > 0 ? f.sms_logs[0] : null;

    return {
      fineId: f.id,
      referenceNumber: f.reference_number,
      categoryCode: f.category_code,
      categoryName: f.categories ? f.categories.name : f.category_code,
      amount: f.amount,
      status: f.status,
      driverName: f.driver_name,
      driverNic: f.driver_nic,
      vehicleNumber: f.vehicle_number,
      districtName: f.districts ? f.districts.name : 'Unknown District',
      districtCode: f.districts ? f.districts.code : '',
      officerName: f.users ? f.users.name : 'Issuing Officer',
      officerBadge: f.users ? f.users.badge_number : 'PS-000',
      createdAt: f.created_at,
      paidAt: f.paid_at,
      paymentMethod: payment ? payment.payment_method : (f.status === 'paid' ? 'Online Card Payment' : null),
      transactionId: payment ? payment.transaction_id : null,
      smsStatus: sms ? sms.status : (f.status === 'paid' ? 'sent' : 'pending'),
      smsTimestamp: sms ? sms.created_at : null
    };
  });

  res.json({
    success: true,
    count: enrichedTransactions.length,
    transactions: enrichedTransactions
  });
});

module.exports = router;
