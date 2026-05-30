// src/routes/listingRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const listingController = require('../controllers/listingController');
const { verifyToken } = require('../middleware/auth');

// Multer setup for image handling
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- Public Routes ---
router.get('/random-feed', listingController.getRandomFeed);

// --- Protected Routes ---
// Use upload.array('images', 5) to match the "images" field in your frontend FormData
router.post('/create', verifyToken, upload.array('images', 5), listingController.createListing);

router.post('/report', verifyToken, listingController.reportListing);

module.exports = router;