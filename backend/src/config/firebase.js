// src/config/firebase.js
const admin = require('firebase-admin');

try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON environment variable.");
    }

    // Parse the raw JSON string directly from your environment variables
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log("🔥 Firebase Admin initialized successfully using Environment String!");
} catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error.message);
    process.exit(1); // Stop the server immediately if DB configuration fails
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
