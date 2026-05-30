// src/controllers/userController.js
const { db, admin } = require('../config/firebase');
const { uploadToR2 } = require('../config/storage');

exports.getUserProfile = async (req, res) => {
    try {
        const targetUid = req.params.userId; 
        
        // Use a direct DB fetch to ensure we have the absolute latest data for the profile
        const userDoc = await db.collection('users').doc(targetUid).get();
        if (!userDoc.exists) return res.status(404).json({ message: "User not found" });
        
        const userData = userDoc.data();

        if (req.user.role !== 'central_admin' && req.user.uid !== targetUid) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        res.status(200).json({
            uid: targetUid,
            email: userData.email,
            role: userData.role,
            walletBalance: userData.walletBalance || 0,
            isVerified: userData.isVerified || false,
            badgeId: userData.badgeId || null
        });
    } catch (error) {
        console.error("Profile Controller Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getWalletBalance = async (req, res) => {
    try {
        // Fetch fresh from DB rather than relying on stale req.user objects
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        res.json({ 
            balance: userDoc.exists ? (userDoc.data().walletBalance || 0) : 0,
            currency: "NGN"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.unlockPremiumContact = async (req, res) => {
    const { listingId } = req.body;
    const buyerId = req.user.uid;
    const UNLOCK_COST = 500;
    const OWNER_COMMISSION = 0.70;

    try {
        const result = await db.runTransaction(async (transaction) => {
            const unlockId = `${buyerId}_${listingId}`;
            const unlockRef = db.collection('unlocks').doc(unlockId);
            const existingUnlock = await transaction.get(unlockRef);

            // 1. Idempotency Check: Prevent double-charging if they already unlocked it
            if (existingUnlock.exists) return { alreadyUnlocked: true };

            const listingRef = db.collection('listings').doc(listingId);
            const listingDoc = await transaction.get(listingRef);
            if (!listingDoc.exists) throw new Error("Listing not found");
            
            const listingData = listingDoc.data();
            const ownerId = listingData.ownerId;

            const buyerRef = db.collection('users').doc(buyerId);
            const buyerDoc = await transaction.get(buyerRef);
            const buyerBalance = buyerDoc.data()?.walletBalance || 0;

            if (buyerBalance < UNLOCK_COST) throw new Error("Insufficient balance");

            const payoutAmount = UNLOCK_COST * OWNER_COMMISSION;

            // 2. Atomic Updates
            transaction.update(buyerRef, { 
                walletBalance: admin.firestore.FieldValue.increment(-UNLOCK_COST) 
            });

            const ownerRef = db.collection('users').doc(ownerId);
            transaction.update(ownerRef, { 
                walletBalance: admin.firestore.FieldValue.increment(payoutAmount) 
            });

            transaction.set(unlockRef, {
                buyerId, listingId, ownerId,
                amountPaid: UNLOCK_COST,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            const logRef = db.collection('transactions').doc();
            transaction.set(logRef, {
                type: 'unlock_payout', buyerId, ownerId,
                totalAmount: UNLOCK_COST,
                ownerEarned: payoutAmount,
                platformFee: UNLOCK_COST - payoutAmount,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        });

        if (result.alreadyUnlocked) {
            return res.status(200).json({ message: "Content already available" });
        }

        res.status(200).json({ message: "Contact unlocked successfully" });
    } catch (error) {
        console.error("Unlock Error:", error);
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
        // FIX: Use a transaction for withdrawal to prevent "Race Conditions" 
        // (where someone triggers two withdrawals simultaneously before the balance updates)
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await transaction.get(userRef);
            const balance = userDoc.data()?.walletBalance || 0;

            if (balance < (amount + FEE)) throw new Error("Insufficient balance.");

            const withdrawalRequest = {
                userId,
                userName: userDoc.data()?.displayName || 'User',
                amount, fee: FEE, totalDeducted: amount + FEE,
                bankDetails, status: 'pending',
                requestedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            transaction.update(userRef, {
                walletBalance: admin.firestore.FieldValue.increment(-(amount + FEE))
            });

            const withdrawalRef = db.collection('withdrawals').doc();
            transaction.set(withdrawalRef, withdrawalRequest);
        });

        res.status(200).json({ message: "Withdrawal request submitted." });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.submitKYC = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Please upload ID documents." });
        }

        const docUrls = await Promise.all(req.files.map(file => uploadToR2(file)));

        await db.collection('users').doc(req.user.uid).update({
            kycStatus: 'pending',
            kycDocuments: docUrls,
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: "KYC documents submitted." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};