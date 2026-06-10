const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data.json');

const defaultDistricts = [
  { id: 'DIS-01', name: 'Colombo Central', code: 'COL-C' },
  { id: 'DIS-02', name: 'Colombo South (Nugegoda)', code: 'COL-S' },
  { id: 'DIS-03', name: 'Gampaha', code: 'GAM' },
  { id: 'DIS-04', name: 'Kandy', code: 'KDY' },
  { id: 'DIS-05', name: 'Galle', code: 'GAL' },
  { id: 'DIS-06', name: 'Matara', code: 'MTR' },
  { id: 'DIS-07', name: 'Jaffna', code: 'JAF' },
  { id: 'DIS-08', name: 'Kurunegala', code: 'KUR' },
  { id: 'DIS-09', name: 'Anuradhapura', code: 'ANU' },
  { id: 'DIS-10', name: 'Badulla', code: 'BAD' }
];

const defaultCategories = [
  { id: 'CAT-01', code: 'SPD', name: 'Exceeding Speed Limit', amount: 3000, description: 'Driving above prescribed speed limit in designated zone' },
  { id: 'CAT-02', code: 'RLS', name: 'Traffic Signal Violation', amount: 2500, description: 'Disregarding red light or traffic police officer signal' },
  { id: 'CAT-03', code: 'DL', name: 'Driving Without License', amount: 5000, description: 'Operating motor vehicle without a valid driving license' },
  { id: 'CAT-04', code: 'INS', name: 'No Valid Revenue/Insurance', amount: 4000, description: 'Failure to produce valid insurance policy or revenue license' },
  { id: 'CAT-05', code: 'HLM', name: 'Helmet Violation', amount: 2000, description: 'Riding motorcycle without wearing standard protective helmet' },
  { id: 'CAT-06', code: 'SB', name: 'Seatbelt Non-Compliance', amount: 2000, description: 'Driver or front passenger not wearing seatbelt' },
  { id: 'CAT-07', code: 'DU', name: 'Driving Under Influence', amount: 10000, description: 'Driving under the influence of liquor or narcotic substances' },
  { id: 'CAT-08', code: 'MOB', name: 'Mobile Phone Usage', amount: 3500, description: 'Using hand-held mobile device while vehicle is in motion' },
  { id: 'CAT-09', code: 'PRK', name: 'Obstruction/Illegal Parking', amount: 1500, description: 'Parking in no-parking zone or causing public obstruction' },
  { id: 'CAT-10', code: 'EM', name: 'Emission Non-Compliance', amount: 2500, description: 'Operating vehicle exceeding permissible exhaust emission limits' }
];

const defaultFines = [
  {
    id: 'FINE-001',
    referenceNumber: 'SLP-2026-88101',
    categoryCode: 'SPD',
    driverNic: '199245100982',
    driverName: 'Kamal Silva',
    vehicleNumber: 'WP CAB-4521',
    amount: 3000,
    status: 'pending',
    issuingOfficerId: 'USR-001',
    officerPhone: '+94771234567',
    officerName: 'Inspector S. Bandara',
    districtId: 'DIS-01',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    paidAt: null
  },
  {
    id: 'FINE-002',
    referenceNumber: 'SLP-2026-99420',
    categoryCode: 'RLS',
    driverNic: '198812300411',
    driverName: 'Nimal Fernando',
    vehicleNumber: 'SP NW-8812',
    amount: 2500,
    status: 'paid',
    issuingOfficerId: 'USR-002',
    officerPhone: '+94779876543',
    officerName: 'Sergeant K. Perera',
    districtId: 'DIS-02',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    paidAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'FINE-003',
    referenceNumber: 'SLP-2026-10452',
    categoryCode: 'MOB',
    driverNic: '199588100123',
    driverName: 'Sunil Rathnayake',
    vehicleNumber: 'WP BJ-9910',
    amount: 3500,
    status: 'paid',
    issuingOfficerId: 'USR-001',
    officerPhone: '+94771234567',
    officerName: 'Inspector S. Bandara',
    districtId: 'DIS-01',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    paidAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'FINE-004',
    referenceNumber: 'SLP-2026-33910',
    categoryCode: 'DL',
    driverNic: '200104500998',
    driverName: 'Ruwan Dissanayake',
    vehicleNumber: 'CP CAR-1029',
    amount: 5000,
    status: 'pending',
    issuingOfficerId: 'USR-001',
    officerPhone: '+94771234567',
    officerName: 'Inspector S. Bandara',
    districtId: 'DIS-04',
    createdAt: new Date().toISOString(),
    paidAt: null
  }
];

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { districts: defaultDistricts, categories: defaultCategories, fines: defaultFines };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    const initialData = { districts: defaultDistricts, categories: defaultCategories, fines: defaultFines };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { loadData, saveData };