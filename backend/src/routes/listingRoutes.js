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

router.post('/unlock/:id', async (req, res) => {
  const listingId = req.params.id;
  const userId = req.user.uid; // From your Auth middleware
  const UNLOCK_FEE = 500;

  try {
    const user = await User.findOne({ firebaseUid: userId });
    const listing = await Listing.findById(listingId);

    // 1. Check if already unlocked
    if (user.unlockedContacts.includes(listingId)) {
      return res.status(200).json({ contact: listing.phoneNumber });
    }

    // 2. Verify funds
    if (user.walletBalance < UNLOCK_FEE) {
      return res.status(403).json({ message: "Insufficient balance. Please top up ₦3,000 minimum." });
    }

    // 3. Atomic Transaction (Simplified for this sprint)
    user.walletBalance -= UNLOCK_FEE;
    user.unlockedContacts.push(listingId);
    
    await user.save();

    res.status(200).json({ 
      contact: listing.phoneNumber, 
      newBalance: user.walletBalance 
    });
  } catch (error) {
    res.status(500).json({ message: "Transaction failed", error: error.message });
  }
});
module.exports = router;
