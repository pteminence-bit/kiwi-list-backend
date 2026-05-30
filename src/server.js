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

// Routes
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);

// Health Check Route (Used by Render to verify successful deployment)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Fallback for 404 - Route Not Found
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handling Middleware (Prevents server from crashing on unhandled errors)
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Kiwi-List backend spinning up on port ${PORT}`);
});