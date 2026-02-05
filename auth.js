const jwt = require('jsonwebtoken');
const axios = require('axios');
const xss = require('xss');
const crypto = require('crypto');
const { sendVerificationEmail, sendWelcomeEmail } = require('./emailService');

const SALT_ROUNDS = 12;

// --- Email/Password Logic ---

async function signup(db, email, password, username) {
    // 1. Strict Password Validation
    // 12+ chars, uppercase, lowercase, at least 1 number, at least 2 symbols
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const symbolCount = (password.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length;

    if (password.length < minLength) throw new Error('password must be at least 12 characters');
    if (!hasUpperCase) throw new Error('password must include an uppercase letter');
    if (!hasLowerCase) throw new Error('password must include a lowercase letter');
    if (!hasNumber) throw new Error('password must include at least one number');
    if (symbolCount < 2) throw new Error('password must include at least two symbols');

    // 2. Basic sanitization
    const cleanUsername = xss(username.toLowerCase());
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    try {
        const result = await db.run(
            'INSERT INTO users (username, email, password, verification_token) VALUES (?, ?, ?, ?)',
            [cleanUsername, email, hashedPassword, verificationToken]
        );

        // 3. Send Verification Email
        await sendVerificationEmail(email, verificationToken);

        return { id: result.lastID, username: cleanUsername };
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error('username or email already exists');
        }
        throw err;
    }
}

async function login(db, email, password) {
    const user = await db.get('SELECT * FROM users WHERE email = ? AND is_deleted = 0', [email]);
    if (!user || !user.password) {
        throw new Error('invalid credentials');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        throw new Error('invalid credentials');
    }

    if (user.is_verified === 0) {
        throw new Error('account initialization incomplete: please verify your email.');
    }

    // Check for bans
    const ban = await db.get('SELECT * FROM bans WHERE user_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)', [user.id]);
    if (ban) {
        throw new Error(`account is banned: ${ban.reason}. contact support@infiniware.org to appeal.`);
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return { token, user: { id: user.id, username: user.username, role: user.role } };
}

// --- GitHub OAuth Logic ---

async function githubAuth(db, code) {
    // 1. Exchange code for access token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
    }, {
        headers: { Accept: 'application/json' }
    });

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) throw new Error('github authentication failed');

    // 2. Fetch user profile
    const userRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}` }
    });

    const { id: github_id, login: username, avatar_url, email } = userRes.data;

    // 3. Check if user exists or create new
    let user = await db.get('SELECT * FROM users WHERE github_id = ? AND is_deleted = 0', [String(github_id)]);

    if (!user) {
        // Create new GH user
        try {
            const result = await db.run(
                'INSERT INTO users (username, github_id, avatar_url, email, is_verified) VALUES (?, ?, ?, ?, 1)',
                [username.toLowerCase(), String(github_id), avatar_url, email]
            );
            user = { id: result.lastID, username: username.toLowerCase(), role: 'user' };

            // Send welcome email for new GH users
            await sendWelcomeEmail(email, username);
        } catch (err) {
            // Handle username collision
            const suffix = Math.floor(Math.random() * 1000);
            const result = await db.run(
                'INSERT INTO users (username, github_id, avatar_url, email, is_verified) VALUES (?, ?, ?, ?, 1)',
                [`${username.toLowerCase()}_${suffix}`, String(github_id), avatar_url, email]
            );
            user = { id: result.lastID, username: `${username.toLowerCase()}_${suffix}`, role: 'user' };
            await sendWelcomeEmail(email, user.username);
        }
    }

    // Check for bans
    const ban = await db.get('SELECT * FROM bans WHERE user_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)', [user.id]);
    if (ban) {
        throw new Error(`account is banned: ${ban.reason}. contact support@infiniware.org to appeal.`);
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return { token, user: { id: user.id, username: user.username, role: user.role } };
}

// --- Multi-Account Management ---

async function deleteAccount(db, userId) {
    await db.run('UPDATE users SET is_deleted = 1, email = NULL, github_id = NULL WHERE id = ?', [userId]);
    return { success: true, message: 'account marked for structural deletion' };
}

module.exports = { signup, login, githubAuth, deleteAccount };
