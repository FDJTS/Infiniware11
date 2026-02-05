const { createPost, getPosts } = require('./guardian');
const jwt = require('jsonwebtoken');

// Middleware to verify human session
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'unauthorized session' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'invalid structural token' });
        req.user = user;
        next();
    });
}

function setupCommunityRoutes(app, db) {
    // 1. Fetch Feed
    app.get('/api/v1/community/posts', async (req, res) => {
        try {
            const posts = await getPosts(db);
            res.json(posts);
        } catch (err) {
            res.status(500).json({ error: 'feed structural failure' });
        }
    });

    // 2. Create Post (Protected)
    app.post('/api/v1/community/posts', authenticateToken, async (req, res) => {
        const { content } = req.body;
        if (!content || content.length < 5) {
            return res.status(400).json({ error: 'content too brief for structural integrity' });
        }

        try {
            const post = await createPost(db, req.user.id, content);
            res.status(201).json({ message: 'post structurally integrated', post });
        } catch (err) {
            res.status(403).json({ error: err.message });
        }
    });
}

module.exports = { setupCommunityRoutes };
