const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Analytics] ${req.method} ${req.url}`);
  next();
});

app.use('/api/analytics', routes);

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Analytics Service running on port ${PORT}`);
});