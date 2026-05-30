const express = require('express');
const router = express.Router();
const multer = require('multer');
const listingController = require('../controllers/listingController');
const { verifyToken } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', verifyToken, upload.array('images', 5), listingController.createListing);
// Example backend controller update for /api/listings/feed
router.get('/feed', async (req, res) => {
  try {
    const count = await Listing.countDocuments();
    
    // If the database is empty, return an empty array instantly instead of trying to sample
    if (count === 0) {
      return res.status(200).json([]);
    }

    // Your existing aggregation logic
    const listings = await Listing.aggregate([
      { $sample: { size: Math.min(count, 10) } }
    ]);

    res.status(200).json(listings);
  } catch (error) {
    console.error("Feed error:", error);
    res.status(500).json({ message: "Server error generating feed", error: error.message });
  }
});
module.exports = router;
