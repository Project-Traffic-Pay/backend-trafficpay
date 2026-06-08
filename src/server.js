// Initial Backend Express Server Draft
const express = require('express');
const app = express();
app.use(express.json());

// Temporary mock health route
app.get('/health', (req, res) => {
    res.send({ status: 'running', message: 'TrafficPay Backend API Server' });
});

app.listen(5000, () => console.log('Backend listening on 5000'));
