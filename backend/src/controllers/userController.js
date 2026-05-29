const { db } = require('../config/firebase');

exports.getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) return res.status(404).send("User not found");

        const userData = userDoc.data();
        
        // GUEST PROTECTOR: Guests cannot view public profiles
        if (req.user.role === 'guest') {
            return res.status(403).json({ message: "Please log in to view user profiles." });
        }

        // Only return necessary public info (Hide wallet/docs from others)
        const publicData = {
            displayName: userData.displayName,
            isVerified: userData.isVerified, // Twitter-style badge status
            listingsCount: userData.listingsCount || 0
        };

        res.json(publicData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getWalletBalance = async (req, res) => {
    // Users can only view their own wallet
    res.json({ 
        balance: req.user.walletBalance || 0,
        currency: "NGN"
    });
};

exports.unlockPremiumContact = async (req, res) => {
    const { listingId } = req.body;
    const buyerId = req.user.uid;
    const UNLOCK_COST = 500;
    const OWNER_COMMISSION = 0.70; // 70%

    try {
        await db.runTransaction(async (transaction) => {
            // 1. Get Listing & Buyer Data
            const listingRef = db.collection('listings').doc(listingId);
            const listingDoc = await transaction.get(listingRef);
            
            if (!listingDoc.exists) throw new Error("Listing not found");
            const listingData = listingDoc.data();
            const ownerId = listingData.ownerId;

            const buyerRef = db.collection('users').doc(buyerId);
            const buyerDoc = await transaction.get(buyerRef);
            const buyerBalance = buyerDoc.data().walletBalance || 0;

            if (buyerBalance < UNLOCK_COST) throw new Error("Insufficient balance");

            // 2. Calculate Payouts
            const payoutAmount = UNLOCK_COST * OWNER_COMMISSION;

            // 3. Update Wallets
            transaction.update(buyerRef, { 
                walletBalance: admin.firestore.FieldValue.increment(-UNLOCK_COST) 
            });

            const ownerRef = db.collection('users').doc(ownerId);
            transaction.update(ownerRef, { 
                walletBalance: admin.firestore.FieldValue.increment(payoutAmount) 
            });

            // 4. Record the Unlock for the Buyer
            const unlockRef = db.collection('unlocks').doc(`${buyerId}_${listingId}`);
            transaction.set(unlockRef, {
                buyerId,
                listingId,
                ownerId,
                amountPaid: UNLOCK_COST,
                timestamp: new Date()
            });

            // 5. Audit Log
            const logRef = db.collection('transactions').doc();
            transaction.set(logRef, {
                type: 'unlock_payout',
                buyerId,
                ownerId,
                totalAmount: UNLOCK_COST,
                ownerEarned: payoutAmount,
                platformFee: UNLOCK_COST - payoutAmount,
                timestamp: new Date()
            });
        });

        res.status(200).json({ message: "Contact unlocked successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.requestWithdrawal = async (req, res) => {
    const { amount, bankDetails } = req.body;
    const userId = req.user.uid;
    const MIN_WITHDRAWAL = 3000;
    const FEE = 150;

    if (amount < MIN_WITHDRAWAL) {
        return res.status(400).json({ message: `Minimum withdrawal is ${MIN_WITHDRAWAL} NGN` });
    }

    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const balance = userDoc.data().walletBalance || 0;

        if (balance < (amount + FEE)) {
            return res.status(400).json({ message: "Insufficient balance to cover withdrawal + fee." });
        }

        // Create a Pending Withdrawal Request for Admins to review
        const withdrawalRequest = {
            userId,
            userName: userDoc.data().displayName,
            amount,
            fee: FEE,
            totalDeducted: amount + FEE,
            bankDetails,
            status: 'pending', // Admins will change this to 'approved' or 'rejected'
            requestedAt: new Date()
        };

        // Deduct from wallet immediately (escrow)
        await userRef.update({
            walletBalance: admin.firestore.FieldValue.increment(-(amount + FEE))
        });

        await db.collection('withdrawals').add(withdrawalRequest);

        res.status(200).json({ message: "Withdrawal request submitted for review." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const { uploadToR2 } = require('../config/storage');

// User submits documents
exports.submitKYC = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Please upload ID documents." });
        }

        // Upload documents to a private path in R2
        const docUrls = await Promise.all(req.files.map(file => uploadToR2(file, 'kyc-docs')));

        await db.collection('users').doc(req.user.uid).update({
            kycStatus: 'pending',
            kycDocuments: docUrls,
            submittedAt: new Date()
        });

        res.status(200).json({ message: "KYC documents submitted for review." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin approves verification (Twitter Badge logic)
exports.verifyUser = async (req, res) => {
    const { userId, action } = req.body; // action: 'approve' or 'reject'

    try {
        const isApproved = action === 'approve';
        
        await db.collection('users').doc(userId).update({
            isVerified: isApproved, // This triggers the blue badge in frontend
            kycStatus: isApproved ? 'verified' : 'rejected',
            verifiedAt: isApproved ? new Date() : null
        });

        res.status(200).json({ message: `User verification ${action}ed.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};