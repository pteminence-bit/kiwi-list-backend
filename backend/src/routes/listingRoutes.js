const express = require('express');
const router = express.Router();
const multer = require('multer');
const listingController = require('../controllers/listingController');
const { verifyToken } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', verifyToken, upload.array('images', 5), listingController.createListing);
router.get('/feed', listingController.getRandomFeed);

module.exports = router;
