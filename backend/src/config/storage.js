const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2Client = require("./r2");
const { v4: uuidv4 } = require("uuid");

exports.uploadToR2 = async (file) => {
    const fileKey = `listings/${uuidv4()}-${file.originalname}`;
    
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    await r2Client.send(command);
    // Return the public URL (ensure your R2 bucket has a public domain/URL configured)
    return `https://pub-your-id.r2.dev/${fileKey}`; 
};
