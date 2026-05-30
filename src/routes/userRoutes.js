// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');
// FIX: Ensured path matches exact case-sensitivity of file structure
const { verifyToken, checkRole } = require('../middleware/auth');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Optional: 5MB file size limit safety guard
});

// Public route but restricted logic inside controller
router.get('/profile/:userId', verifyToken, userController.getUserProfile);

// Secure routes
router.get('/wallet', verifyToken, checkRole(['normal', 'admin', 'central_admin']), userController.getWalletBalance);
router.post('/unlock', verifyToken, userController.unlockPremiumContact);
router.post('/withdraw', verifyToken, userController.requestWithdrawal);

// KYC route with document uploads
router.post('/kyc-submit', verifyToken, upload.array('documents', 2), userController.submitKYC);

module.exports = router;