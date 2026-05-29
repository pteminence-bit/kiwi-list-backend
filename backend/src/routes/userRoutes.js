const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Public route but restricted logic inside controller
router.get('/profile/:userId', verifyToken, userController.getUserProfile);

// Secure routes
router.get('/wallet', verifyToken, checkRole(['normal', 'admin', 'central_admin']), userController.getWalletBalance);
router.post('/unlock', verifyToken, userController.unlockPremiumContact);
router.post('/withdraw', verifyToken, userController.requestWithdrawal);
router.post('/kyc-submit', verifyToken, upload.array('documents', 2), userController.submitKYC);

module.exports = router;


