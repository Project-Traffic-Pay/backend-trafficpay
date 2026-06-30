const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fixPasswords() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const officerHash = await bcrypt.hash('officer123', 10);

  console.log('Updating admin...');
  await supabase.from('users').update({ password_hash: adminHash }).eq('email', 'admin.traffic@police.lk');
  
  console.log('Updating officers...');
  await supabase.from('users').update({ password_hash: officerHash }).eq('email', 'officer.bandara@police.lk');
  await supabase.from('users').update({ password_hash: officerHash }).eq('email', 'officer.perera@police.lk');

  console.log('Done!');
}

fixPasswords();
