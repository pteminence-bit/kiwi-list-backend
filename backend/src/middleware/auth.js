const { auth, db } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        // If no token, they are a Guest
        req.user = { role: 'guest' };
        return next();
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ message: "User record not found" });
        }

        req.user = { ...decodedToken, ...userDoc.data() };
        next();
    } catch (error) {
        console.error("Auth Error:", error);
        res.status(401).json({ message: "Unauthorized access" });
    }
};

// Specific role checks
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Requires one of: ${roles.join(', ')}` 
            });
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };
