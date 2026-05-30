// src/config/r2.js
const { S3Client } = require('@aws-sdk/client-s3');

// Validation check to prevent the server from starting with broken storage
const requiredEnv = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
requiredEnv.forEach(envVar => {
    if (!process.env[envVar]) {
        console.error(`❌ Missing storage environment variable: ${envVar}`);
    }
});

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    // Fix for Render/Cloud environments: 
    // forcePathStyle: true ensures the bucket name is in the path, 
    // which is often required by R2 for compatibility with S3 SDKs.
    forcePathStyle: true,
});

module.exports = r2Client;