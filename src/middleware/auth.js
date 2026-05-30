// src/middleware/auth.js
const { auth, db } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // 1. Guest Handling
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = { role: 'guest', uid: null };
        return next();
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        // 2. Verify the Firebase JWT
        const decodedToken = await auth.verifyIdToken(idToken);
        
        // 3. Optimization: Attach UID and basic info from token first
        // Only fetch from DB if we actually need role/balance/etc.
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            // Default setup for first-time users
            req.user = { 
                uid: decodedToken.uid, 
                email: decodedToken.email, 
                role: 'normal',
                walletBalance: 0 
            };
        } else {
            // Combine token data with DB data
            req.user = { ...decodedToken, ...userDoc.data() };
        }

        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.code || error.message);
        
        // Handle specific Firebase Auth errors for better UX
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ message: "Session expired. Please login again." });
        }
        res.status(401).json({ message: "Invalid authentication." });
    }
};

// 4. Role Authorization Helper
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}` 
            });
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };