const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Fine] ${req.method} ${req.url}`);
  next();
});

app.use('/api/fines', routes);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Fine Service running on port ${PORT}`);
});