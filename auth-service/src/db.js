const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '..', 'data.json');

const defaultUsers = [
  {
    id: 'USR-001',
    name: 'Inspector S. Bandara',
    email: 'officer.bandara@police.lk',
    passwordHash: bcrypt.hashSync('officer123', 10),
    role: 'officer',
    badgeNumber: 'IP-88421',
    districtId: 'DIS-01',
    phoneNumber: '+94771234567'
  },
  {
    id: 'USR-002',
    name: 'Sergeant K. Perera',
    email: 'officer.perera@police.lk',
    passwordHash: bcrypt.hashSync('officer123', 10),
    role: 'officer',
    badgeNumber: 'PS-44120',
    districtId: 'DIS-02',
    phoneNumber: '+94779876543'
  },
  {
    id: 'USR-003',
    name: 'DIG Traffic N. Jayawardena',
    email: 'admin.traffic@police.lk',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    badgeNumber: 'DIG-001',
    districtId: 'DIS-01',
    phoneNumber: '+94710001122'
  }
];

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: defaultUsers };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    const initialData = { users: defaultUsers };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { loadData, saveData };