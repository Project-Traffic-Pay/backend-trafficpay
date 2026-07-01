-- TrafficPay Supabase Database Schema

-- 1. Districts Table
CREATE TABLE IF NOT EXISTS public.districts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT
);

-- 3. Users Table (Officers & Admins)
-- Note: In a production Supabase app, you'd use Supabase Auth (auth.users). 
-- For this migration, we'll keep the existing structure but map it to a table.
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    badge_number TEXT,
    district_id TEXT REFERENCES public.districts(id),
    phone_number TEXT
);

-- 4. Fines Table
CREATE TABLE IF NOT EXISTS public.fines (
    id TEXT PRIMARY KEY,
    reference_number TEXT NOT NULL UNIQUE,
    category_code TEXT NOT NULL REFERENCES public.categories(code),
    driver_nic TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    issuing_officer_id TEXT REFERENCES public.users(id),
    district_id TEXT REFERENCES public.districts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    fine_id TEXT NOT NULL REFERENCES public.fines(id),
    reference_number TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id TEXT PRIMARY KEY,
    fine_id TEXT NOT NULL REFERENCES public.fines(id),
    reference_number TEXT NOT NULL,
    officer_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - optional but recommended
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all access (since we handle auth in the Express backend)
CREATE POLICY "Allow all on districts" ON public.districts FOR ALL USING (true);
CREATE POLICY "Allow all on categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow all on fines" ON public.fines FOR ALL USING (true);
CREATE POLICY "Allow all on payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow all on sms_logs" ON public.sms_logs FOR ALL USING (true);

-- ==========================================
-- SEED DATA
-- ==========================================

INSERT INTO public.districts (id, name, code) VALUES
('DIS-01', 'Colombo Central', 'COL-C'),
('DIS-02', 'Colombo South (Nugegoda)', 'COL-S'),
('DIS-03', 'Gampaha', 'GAM'),
('DIS-04', 'Kandy', 'KDY'),
('DIS-05', 'Galle', 'GAL'),
('DIS-06', 'Matara', 'MTR'),
('DIS-07', 'Jaffna', 'JAF'),
('DIS-08', 'Kurunegala', 'KUR'),
('DIS-09', 'Anuradhapura', 'ANU'),
('DIS-10', 'Badulla', 'BAD')
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (id, code, name, amount, description) VALUES
('CAT-01', 'SPD', 'Exceeding Speed Limit', 3000, 'Driving above prescribed speed limit in designated zone'),
('CAT-02', 'RLS', 'Traffic Signal Violation', 2500, 'Disregarding red light or traffic police officer signal'),
('CAT-03', 'DL', 'Driving Without License', 5000, 'Operating motor vehicle without a valid driving license'),
('CAT-04', 'INS', 'No Valid Revenue/Insurance', 4000, 'Failure to produce valid insurance policy or revenue license'),
('CAT-05', 'HLM', 'Helmet Violation', 2000, 'Riding motorcycle without wearing standard protective helmet'),
('CAT-06', 'SB', 'Seatbelt Non-Compliance', 2000, 'Driver or front passenger not wearing seatbelt'),
('CAT-07', 'DU', 'Driving Under Influence', 10000, 'Driving under the influence of liquor or narcotic substances'),
('CAT-08', 'MOB', 'Mobile Phone Usage', 3500, 'Using hand-held mobile device while vehicle is in motion'),
('CAT-09', 'PRK', 'Obstruction/Illegal Parking', 1500, 'Parking in no-parking zone or causing public obstruction'),
('CAT-10', 'EM', 'Emission Non-Compliance', 2500, 'Operating vehicle exceeding permissible exhaust emission limits')
ON CONFLICT DO NOTHING;

-- Mock users
INSERT INTO public.users (id, name, email, password_hash, role, badge_number, district_id, phone_number) VALUES
('USR-001', 'Inspector S. Bandara', 'officer.bandara@police.lk', '$2a$10$T8Z/kS0wJ2Wb/U7I5v/v1.r.yE7o2mP9A0d7G/Yf9S0e4s1n0zXm.', 'officer', 'IP-88421', 'DIS-01', '+94771234567'),
('USR-002', 'Sergeant K. Perera', 'officer.perera@police.lk', '$2a$10$T8Z/kS0wJ2Wb/U7I5v/v1.r.yE7o2mP9A0d7G/Yf9S0e4s1n0zXm.', 'officer', 'PS-44120', 'DIS-02', '+94779876543'),
('USR-003', 'DIG Traffic N. Jayawardena', 'admin.traffic@police.lk', '$2a$10$O0K8A/o0jYq6pW4J/1/9eO.p9B2A7X0a8Y8n2W2t9N9a1C5m0x2lC', 'admin', 'DIG-001', 'DIS-01', '+94710001122')
ON CONFLICT DO NOTHING;
