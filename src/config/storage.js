// src/config/storage.js
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2Client = require("./r2");
const { v4: uuidv4 } = require("uuid");

exports.uploadToR2 = async (file) => {
    // Safety guard to catch unconfigured bucket variables before making network requests
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
        throw new Error("Missing R2 bucket configuration variables.");
    }

    const fileKey = `listings/${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;
    
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    await r2Client.send(command);
    
    // FIX: Dynamically stitch public URL based on an environment variable (e.g., https://pub-your-id.r2.dev)
    const baseUrl = process.env.R2_PUBLIC_URL.endsWith('/') 
        ? process.env.R2_PUBLIC_URL.slice(0, -1) 
        : process.env.R2_PUBLIC_URL;

    return `${baseUrl}/${fileKey}`; 
};