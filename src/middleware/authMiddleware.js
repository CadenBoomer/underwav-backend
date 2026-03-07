// This middleware protects routes, verifies the token, and ensures the user exists in your database. 
// Controllers downstream can safely use req.user.


// Imports the JWT library (jsonwebtoken) to verify tokens.
// Imports your database pool so you can query user info from MySQL.
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
//Verifies JWT token and attaches user info to req.user. Used to protect routes that require authentication.

//Exports a middleware function.
// req = request object, res = response object, next = function to move to the next middleware/controller.
module.exports = async function (req, res, next) {

    //Reads the Authorization header from the request.
    // Expects a Bearer token like: Authorization: Bearer <token>
    // split(' ')[1] grabs just the token part.

    const authHeader = req.headers['authorization'];
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;

    //If no token is sent, return 401 Unauthorized.
    // Stops the request here.

    if (!token) return res.status(401).json({ message: 'Access denied' });

    //Uses your secret key (JWT_SECRET) to verify the token.
    // decoded now contains the payload you originally signed, usually { id: userId, ... }.
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info
        // Queries the database to confirm the user exists.
        // If the user doesn’t exist sends 401 Unauthorized.
        const [rows] = await pool.query('SELECT id, username, email FROM users WHERE id = ?', [decoded.id]);
        if (rows.length === 0) return res.status(401).json({ message: 'User not found' });

        //  Attaches the user info to req.user for later use in your routes.
        // Calls next() to continue to the actual controller.
        req.user = rows[0];
        next();

        //If JWT verification fails (e.g., token expired, tampered), send 403 Forbidden.
    } catch (err) {
        res.status(403).json({ message: 'Invalid token' });
    }
};
