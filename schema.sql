-- Draft Database Schema for TrafficPay System
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE fines (
    id SERIAL PRIMARY KEY,
    license_plate VARCHAR(20) NOT NULL,
    amount NUMERIC NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid'
);
