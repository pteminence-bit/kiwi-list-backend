// src/routes/listingRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const listingController = require('../controllers/listingController');
const { verifyToken } = require('../middleware/auth');

// Memory storage is best for Render's ephemeral file system
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit safety
});

// Public Routes
router.get('/random-feed', listingController.getRandomFeed);

// Protected Routes
// 'images' is the field name the frontend should use in the FormData
router.post('/create', verifyToken, upload.array('images', 5), listingController.createListing);

router.post('/report', verifyToken, listingController.reportListing);

module.exports = router;