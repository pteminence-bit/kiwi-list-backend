const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/metrics', verifyToken, checkRole(['central_admin']), adminController.getPlatformMetrics);

module.exports = router;

// Central Admin & Other Admins can verify/restrict
router.post('/verify-user', verifyToken, checkRole(['central_admin', 'admin']), userController.verifyUser);
router.get('/pending-kyc', verifyToken, checkRole(['central_admin', 'admin']), async (req, res) => {
    const snapshot = await db.collection('users').where('kycStatus', '==', 'pending').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
});