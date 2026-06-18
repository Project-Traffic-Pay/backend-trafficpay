const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@police.lk' && password === 'admin123') {
        return res.json({ token: 'mock-jwt-token-12345', user: { role: 'admin' } });
    }
    return res.status(401).json({ message: 'Invalid credentials' });
});

module.exports = router;
