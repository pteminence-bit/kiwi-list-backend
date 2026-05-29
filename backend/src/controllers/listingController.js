const { db, admin } = require('../config/firebase');
const { uploadToR2 } = require('../config/storage');

exports.createListing = async (req, res) => {
    const { title, description, category, location, type, tier } = req.body;
    const userId = req.user.uid;
    const PREMIUM_PRICE = 3000;

    try {
        const userRef = db.collection('users').doc(userId);
        
        // 1. Logic for Premium Tier
        if (tier === 'premium') {
            const userDoc = await userRef.get();
            const balance = userDoc.data().walletBalance || 0;

            if (balance < PREMIUM_PRICE) {
                return res.status(400).json({ message: "Insufficient wallet balance for Premium listing." });
            }

            // Deduct funds immediately
            await userRef.update({
                walletBalance: admin.firestore.FieldValue.increment(-PREMIUM_PRICE)
            });

            // Log Transaction
            await db.collection('transactions').add({
                userId,
                amount: PREMIUM_PRICE,
                type: 'debit',
                purpose: 'premium_listing_fee',
                timestamp: new Date()
            });
        }

        // 2. Handle Image Uploads
        const imageUrls = await Promise.all(req.files.map(file => uploadToR2(file)));

        // 3. Create Listing with "X.com style" Random Seed
        const listingData = {
            title,
            description,
            category, // Rent or Sale
            location,
            type, // Apartment, Land, etc.
            tier, // Free or Premium
            images: imageUrls,
            ownerId: userId,
            createdAt: new Date(),
            availability: true,
            randomSeed: Math.random(), // Used for X-style random shuffle
            badgeId: `KW-${Math.floor(1000 + Math.random() * 9000)}` // Auto-generated ID
        };

        const docRef = await db.collection('listings').add(listingData);
        res.status(201).json({ id: docRef.id, ...listingData });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRandomFeed = async (req, res) => {
    try {
        const randomStart = Math.random();
        const listingsSnapshot = await db.collection('listings')
            .where('randomSeed', '>=', randomStart)
            .limit(10)
            .get();

        let listings = listingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // If we don't have enough, wrap around and get the rest
        if (listings.length < 10) {
            const extraSnapshot = await db.collection('listings')
                .where('randomSeed', '<', randomStart)
                .limit(10 - listings.length)
                .get();
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
        const listingRef = db.collection('listings').doc(listingId);
        const listingDoc = await listingRef.get();
        const ownerId = listingDoc.data().ownerId;

        // 1. Log the report
        await db.collection('reports').add({
            listingId,
            ownerId,
            reporterId,
            reason,
            timestamp: new Date()
        });

        // 2. Impact Account Health
        const ownerRef = db.collection('users').doc(ownerId);
        await ownerRef.update({
            flags: admin.firestore.FieldValue.increment(1)
        });

        // 3. Auto-restrict if flags > 3
        const ownerDoc = await ownerRef.get();
        if (ownerDoc.data().flags >= 3) {
            await ownerRef.update({ accountStatus: 'restricted' });
        }

        res.status(200).json({ message: "Report submitted. Thank you for keeping Kiwi-List safe." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};