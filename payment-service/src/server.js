const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Payment] ${req.method} ${req.url}`);
  next();
});

app.use('/api/payments', routes);

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});