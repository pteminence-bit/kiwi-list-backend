const { db, admin } = require('../config/firebase');
const { uploadToR2 } = require('../config/storage');

exports.createListing = async (req, res) => {
    const { title, description, category, location, type, tier } = req.body;
    const userId = req.user.uid;
    const PREMIUM_PRICE = 3000;

    try {
        const imageUrls = req.files && req.files.length > 0 
            ? await Promise.all(req.files.map(file => uploadToR2(file)))
            : [];

        const listingId = db.collection('listings').doc().id;
        const userRef = db.collection('users').doc(userId);
        const listingRef = db.collection('listings').doc(listingId);

        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("User not found");

            if (tier === 'premium') {
                const balance = userDoc.data().walletBalance || 0;
                if (balance < PREMIUM_PRICE) throw new Error("Insufficient wallet balance.");

                transaction.update(userRef, {
                    walletBalance: admin.firestore.FieldValue.increment(-PREMIUM_PRICE)
                });

                const logRef = db.collection('transactions').doc();
                transaction.set(logRef, {
                    userId, amount: PREMIUM_PRICE, type: 'debit',
                    purpose: 'premium_listing_fee', listingId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            const listingData = {
                title, description, category, location, type, tier,
                images: imageUrls,
                ownerId: userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                availability: true,
                randomSeed: Math.random(),
                badgeId: `KW-${Math.floor(1000 + Math.random() * 9000)}`
            };

            transaction.set(listingRef, listingData);
        });

        res.status(201).json({ id: listingId, message: "Listing created successfully" });
    } catch (error) {
        console.error("Create Listing Error:", error);
        res.status(400).json({ error: error.message });
    }
};

exports.getRandomFeed = async (req, res) => {
    try {
        const randomStart = Math.random();
        let snapshot = await db.collection('listings')
            .where('availability', '==', true)
            .where('randomSeed', '>=', randomStart)
            .limit(10).get();

        let listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (listings.length < 10) {
            let extraSnapshot = await db.collection('listings')
                .where('availability', '==', true)
                .where('randomSeed', '<', randomStart)
                .limit(10 - listings.length).get();
            listings = [...listings, ...extraSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))];
        }

        res.json(listings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.reportListing = async (req, res) => {
    const { listingId, reason } = req.body;
    const reporterId = req.user.uid;

    try {
        await db.runTransaction(async (transaction) => {
            const listingRef = db.collection('listings').doc(listingId);
            const listingDoc = await transaction.get(listingRef);
            if (!listingDoc.exists) throw new Error("Listing not found");
            
            const ownerId = listingDoc.data().ownerId;
            const ownerRef = db.collection('users').doc(ownerId);

            const reportRef = db.collection('reports').doc();
            transaction.set(reportRef, {
                listingId, ownerId, reporterId, reason,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            transaction.update(ownerRef, {
                flags: admin.firestore.FieldValue.increment(1)
            });
        });

        res.status(200).json({ message: "Report submitted." });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
