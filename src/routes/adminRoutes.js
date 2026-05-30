// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController'); // Required for verifyUser
const { verifyToken, checkRole } = require('../middleware/auth');
const { db } = require('../config/firebase');

// Platform Metrics
router.get('/metrics', verifyToken, checkRole(['central_admin']), adminController.getPlatformMetrics);

// KYC & Verification
router.post('/verify-user', verifyToken, checkRole(['central_admin', 'admin']), userController.verifyUser);

router.get('/pending-kyc', verifyToken, checkRole(['central_admin', 'admin']), async (req, res) => {
    try {
        const snapshot = await db.collection('users').where('kycStatus', '==', 'pending').get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;