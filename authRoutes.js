const { signup, login, githubAuth, deleteAccount } = require('./auth');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('./emailService');

function setupAuthRoutes(app, db) {
    // 1. Email Signup
    app.post('/api/v1/auth/signup', async (req, res) => {
        const { email, password, username } = req.body;
        if (!email || !password || !username) {
            return res.status(400).json({ error: 'missing required fields' });
        }

        try {
            const user = await signup(db, email, password, username);
            res.status(201).json({ message: 'human account initialized', user });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    // 2. Email Login
    app.post('/api/v1/auth/login', async (req, res) => {
        const { email, password } = req.body;
        try {
            const { token, user } = await login(db, email, password);
            res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
            res.json({ message: 'structural authentication successful', user });
        } catch (err) {
            res.status(401).json({ error: err.message });
        }
    });

    // 3. GitHub OAuth
    app.get('/api/v1/auth/github', (req, res) => {
        const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_CALLBACK_URL}&scope=user:email`;
        res.redirect(url);
    });

    app.get('/auth/github/callback', async (req, res) => {
        const { code } = req.query;
        try {
            const { token, user } = await githubAuth(db, code);
            res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
            res.redirect('/welcome.html?source=github'); // redirect to welcome
        } catch (err) {
            res.redirect(`/community.html?auth=error&message=${encodeURIComponent(err.message)}`);
        }
    });

    // 3.1 Email Verification
    app.get('/api/v1/auth/verify', async (req, res) => {
        const { token } = req.query;
        if (!token) return res.status(400).send('verification token missing');

        try {
            const user = await db.get('SELECT * FROM users WHERE verification_token = ?', [token]);
            if (!user) return res.status(404).send('invalid or expired verification token');

            await db.run('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);

            // Send welcome email after verification
            await sendWelcomeEmail(user.email, user.username);

            res.redirect('/welcome.html?source=email&verified=true');
        } catch (err) {
            res.status(500).send('structural integrity error during verification');
        }
    });

    // 4. Logout
    app.post('/api/v1/auth/logout', (req, res) => {
        res.clearCookie('token');
        res.json({ message: 'session structurally terminated' });
    });

    // 5. Get Current User (Session Check)
    app.get('/api/v1/auth/me', async (req, res) => {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'no session' });
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await db.get('SELECT id, username, role, avatar_url FROM users WHERE id = ? AND is_deleted = 0', [decoded.id]);
            if (!user) return res.status(404).json({ error: 'user not found' });
            res.json(user);
        } catch (err) {
            res.status(401).json({ error: 'invalid session' });
        }
    });

    // 6. Delete Account (Protected)
    app.delete('/api/v1/auth/me', async (req, res) => {
        // Note: Simple placeholder for token verification (next step)
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'unauthorized' });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            await deleteAccount(db, decoded.id);
            res.clearCookie('token');
            res.json({ message: 'account deleted permanently' });
        } catch (err) {
            res.status(401).json({ error: 'invalid session' });
        }
    });
}

module.exports = { setupAuthRoutes };
