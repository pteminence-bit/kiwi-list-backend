// src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const listingRoutes = require('./routes/listingRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Kiwi-List backend spinning up on port ${PORT}`);
});