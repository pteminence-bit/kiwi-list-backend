const { db } = require('../config/firebase');

exports.getPlatformMetrics = async (req, res) => {
    try {
        // Simple counts (In production, use a 'metadata' doc to avoid expensive reads)
        const listingsSnap = await db.collection('listings').count().get();
        const usersSnap = await db.collection('users').count().get();
        
        // Sum total revenue from platform fees
        const txSnap = await db.collection('transactions')
            .where('type', '==', 'unlock_payout')
            .get();

        let totalRevenue = 0;
        txSnap.forEach(doc => {
            totalRevenue += doc.data().platformFee;
        });

        res.json({
            totalUsers: usersSnap.data().count,
            totalListings: listingsSnap.data().count,
            platformRevenue: totalRevenue,
            currency: "NGN"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
