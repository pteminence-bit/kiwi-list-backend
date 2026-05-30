// src/config/firebase.js
const admin = require('firebase-admin');

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountEnv) {
    console.error("❌ Failed to initialize Firebase Admin: Missing FIREBASE_SERVICE_ACCOUNT_JSON environment variable.");
    process.exit(1);
}

try {
    // Parse the minified string safely
    const serviceAccount = JSON.parse(serviceAccountEnv);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    console.log("🔥 Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("❌ Firebase Initialization Error:", error.message);
    process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };