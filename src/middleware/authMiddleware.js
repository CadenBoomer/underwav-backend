const jwt = require('jsonwebtoken');
const pool = require('../config/db');
//Verifies JWT token and attaches user info to req.user. Used to protect routes that require authentication.

module.exports = async function(req, res, next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Attach user info
        const [rows] = await pool.query('SELECT id, username, email FROM users WHERE id = ?', [decoded.id]);
        if(rows.length === 0) return res.status(401).json({ message: 'User not found' });
        req.user = rows[0];
        next();
    } catch(err){
        res.status(403).json({ message: 'Invalid token' });
    }
};
