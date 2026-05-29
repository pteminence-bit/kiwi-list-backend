const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

admin.initializeApp({

    credential: admin.credential.cert(serviceAccountPath)
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
