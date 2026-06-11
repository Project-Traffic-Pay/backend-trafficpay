const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Notification] ${req.method} ${req.url}`);
  next();
});

app.use('/api/notifications', routes);

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});