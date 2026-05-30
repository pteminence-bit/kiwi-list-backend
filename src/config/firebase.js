// src/config/firebase.js
const admin = require('firebase-admin');

const base64Credentials = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

if (!base64Credentials) {
    console.error("❌ Failed to initialize Firebase Admin: Missing FIREBASE_SERVICE_ACCOUNT_B64 environment variable.");
    process.exit(1);
}

try {
    // Decode the safe Base64 string directly back into a standard utf8 text stream
    const decodedJsonText = Buffer.from(base64Credentials, 'base64').toString('utf8');
    
    // Parse the recovered clean string format
    const serviceAccount = JSON.parse(decodedJsonText);

    // FIX: Ensure escaped newline characters inside the private key are parsed correctly by the runtime
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    console.log("🔥 Firebase Admin SDK initialized successfully via Base64 recovery.");
} catch (error) {
    console.error("❌ Firebase Initialization Error:", error.message);
    process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };