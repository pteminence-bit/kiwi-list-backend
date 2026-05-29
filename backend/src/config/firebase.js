// src/config/firebase.js
const admin = require('firebase-admin');
const path = require('path');

try {
    // Render mounts Secret Files in the root directory of your app
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath)
    });
    console.log("🔥 Firebase Admin SDK successfully initialized via Secret File.");
} catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
