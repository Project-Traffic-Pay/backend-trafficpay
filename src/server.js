require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const finesRoutes = require('./routes/fines.routes');
const paymentsRoutes = require('./routes/payments.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Microservice Routes Mapping
app.use('/api/auth', authRoutes);
app.use('/api/fines', finesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Healthcheck / Gateway root endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Digital Traffic Fine Payment System - Sri Lanka Police API Gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'active',
      fineManagement: 'active',
      paymentProcessor: 'active (mock)',
      notificationEngine: 'active (Notify.lk format)',
      analyticsReporting: 'active'
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Sri Lanka Police Digital Traffic Fine Backend System `);
  console.log(`  API Gateway running at http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
