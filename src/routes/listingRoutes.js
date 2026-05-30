// src/routes/listingRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const listingController = require('../controllers/listingController');
const { verifyToken } = require('../middleware/auth');

// 1. Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// 2. Public Routes
// This uses the "X-style" random seed logic we put in your controller
router.get('/random-feed', listingController.getRandomFeed);

// 3. Protected Routes
// Use 'images' as the key in your frontend FormData.append('images', file)
router.post('/create', verifyToken, upload.array('images', 5), listingController.createListing);

// Reporting logic
router.post('/report', verifyToken, listingController.reportListing);

// 4. Premium Unlock Route
// Note: We moved the logic to userController.js earlier to handle wallet transactions better,
// but we keep the route here if that's where your frontend expects it.
const userController = require('../controllers/userController');
router.post('/unlock', verifyToken, userController.unlockPremiumContact);

module.exports = router;