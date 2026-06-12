const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      gateway: 'up',
      auth: 'http://localhost:5001',
      fines: 'http://localhost:5002',
      payments: 'http://localhost:5003',
      notifications: 'http://localhost:5004',
      analytics: 'http://localhost:5005'
    }
  });
});

app.use(createProxyMiddleware({ pathFilter: '/api/auth', target: 'http://localhost:5001', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/fines', target: 'http://localhost:5002', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/payments', target: 'http://localhost:5003', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/notifications', target: 'http://localhost:5004', changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/analytics', target: 'http://localhost:5005', changeOrigin: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});