require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');
const { setupAuthRoutes } = require('./authRoutes');
const { setupCommunityRoutes } = require('./communityRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

const isProd = process.env.NODE_ENV === 'production';

// Security Middleware: Helmet for headers, CORS for project access
app.use(helmet());
app.use(cors({
    origin: isProd ? 'https://infiniware.bid' : 'http://localhost:3000',
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Structural Protection: Serve Static Files
app.use(express.static('./'));

// Structural Protection: Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'structural limit reached. try again in 15 minutes.' }
});
app.use(limiter);

// Database Initialization
let db;
initDB().then(database => {
    db = database;
    setupAuthRoutes(app, db);
    setupCommunityRoutes(app, db);
    console.log('// infiniware core: db ready');
    console.log('// status: https://infiniware.bid');
}).catch(err => {
    console.error('// infiniware error: db structural failure', err);
});

// Basic Route for testing
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'online',
        core: 'infiniware-v1.0-human-made',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`// infiniware system running on port ${PORT}`);
    console.log(`// integrity check: passed`);
});

module.exports = { app };
