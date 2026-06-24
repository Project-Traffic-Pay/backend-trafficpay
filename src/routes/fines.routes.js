const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public: Get maintainable fine categories
router.get('/categories', async (req, res) => {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, categories: data });
});

// Public: Get districts
router.get('/districts', async (req, res) => {
  const { data, error } = await supabase.from('districts').select('*');
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, districts: data });
});

// Public: Lookup fine by reference number + category code (FR-4)
router.get('/lookup', async (req, res) => {
  const { ref, category } = req.query;

  if (!ref || !category) {
    return res.status(400).json({
      success: false,
      message: 'Both reference number (ref) and fine category (category) are required for lookup.'
    });
  }

  const cleanRef = ref.trim().toUpperCase();
  const cleanCat = category.trim().toUpperCase();

  const { data: fine, error } = await supabase
    .from('fines')
    .select(`
      *,
      categories (name, description),
      districts (name, code),
      users (badge_number, phone_number)
    `)
    .eq('reference_number', cleanRef)
    .eq('category_code', cleanCat)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  if (!fine) {
    return res.status(404).json({
      success: false,
      message: `No fine found matching Reference Number '${cleanRef}' and Category Code '${cleanCat}'. Please check your fine sheet.`
    });
  }

  res.json({
    success: true,
    fine: {
      id: fine.id,
      referenceNumber: fine.reference_number,
      categoryCode: fine.category_code,
      categoryName: fine.categories ? fine.categories.name : fine.category_code,
      description: fine.categories ? fine.categories.description : 'Traffic Violation',
      amount: fine.amount,
      status: fine.status,
      driverNic: fine.driver_nic,
      driverName: fine.driver_name,
      vehicleNumber: fine.vehicle_number,
      districtName: fine.districts ? fine.districts.name : 'Unknown District',
      districtCode: fine.districts ? fine.districts.code : '',
      issuingOfficerBadge: fine.users ? fine.users.badge_number : 'IP-OFFICER',
      issuingOfficerPhone: fine.users ? fine.users.phone_number : '+94770000000',
      createdAt: fine.created_at,
      paidAt: fine.paid_at
    }
  });
});

// Protected: Issue fine (Officer or Admin) (FR-3)
router.post('/', authenticateToken, requireRole(['officer', 'admin']), async (req, res) => {
  const { categoryCode, driverNic, driverName, vehicleNumber, districtId } = req.body;

  if (!categoryCode || !driverNic || !driverName || !vehicleNumber) {
    return res.status(400).json({
      success: false,
      message: 'categoryCode, driverNic, driverName, and vehicleNumber are required.'
    });
  }

  const { data: category, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('code', categoryCode.toUpperCase())
    .maybeSingle();

  if (catError || !category) {
    return res.status(400).json({ success: false, message: `Invalid fine category code '${categoryCode}'.` });
  }

  // Generate reference number SLP-2026-XXXXX
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const referenceNumber = `SLP-2026-${randomSuffix}`;

  const assignedDistrictId = districtId || req.user.districtId || 'DIS-01';

  const newFine = {
    id: `FINE-${Date.now().toString().slice(-6)}`,
    reference_number: referenceNumber,
    category_code: category.code,
    driver_nic: driverNic,
    driver_name: driverName,
    vehicle_number: vehicleNumber,
    amount: category.amount,
    status: 'pending',
    issuing_officer_id: req.user.id,
    district_id: assignedDistrictId,
    created_at: new Date().toISOString()
  };

  const { error: insertError } = await supabase.from('fines').insert([newFine]);
  
  if (insertError) {
    return res.status(500).json({ success: false, message: insertError.message });
  }

  // format for frontend
  const responseFine = {
    ...newFine,
    referenceNumber: newFine.reference_number,
    categoryCode: newFine.category_code,
    driverNic: newFine.driver_nic,
    driverName: newFine.driver_name,
    vehicleNumber: newFine.vehicle_number,
    issuingOfficerId: newFine.issuing_officer_id,
    districtId: newFine.district_id,
    createdAt: newFine.created_at,
    paidAt: null
  };

  res.status(201).json({
    success: true,
    message: 'Fine ticket generated successfully.',
    fine: responseFine
  });
});

// Protected: List all fines (Admin or Officer)
router.get('/', authenticateToken, async (req, res) => {
  let query = supabase.from('fines').select('*');

  if (req.user.role === 'officer') {
    query = query.or(`issuing_officer_id.eq.${req.user.id},district_id.eq.${req.user.districtId}`);
  }

  if (req.query.status) {
    query = query.eq('status', req.query.status.toLowerCase());
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  // Map back to camelCase for the frontend
  const finesList = data.map(f => ({
    id: f.id,
    referenceNumber: f.reference_number,
    categoryCode: f.category_code,
    driverNic: f.driver_nic,
    driverName: f.driver_name,
    vehicleNumber: f.vehicle_number,
    amount: f.amount,
    status: f.status,
    issuingOfficerId: f.issuing_officer_id,
    districtId: f.district_id,
    createdAt: f.created_at,
    paidAt: f.paid_at
  }));

  res.json({ success: true, count: finesList.length, fines: finesList });
});

module.exports = router;
