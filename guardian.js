const xss = require('xss');

// --- Moderation Constants ---
const FORBIDDEN_WORDS = [
    'illegal', 'exploit', 'malware', 'virus', 'jeffrey-epstein', 'nsfw', 'porn', 'nude', 'hentai', 'sex',
    'darkweb', 'torlink', 'crypto-scam', 'phishing', 'ransomware', 'carding', 'hitman',
    'terrorism', 'extremist', 'pedophilia', 'child-abuse', 'snuff', 'bestiality', 'incest',
    'rape', 'assault', 'murder', 'gore', 'suicide-guide', 'drugs-sale', 'weapon-sale',
    'ddos-service', 'botnet', 'stealer', 'keylogger', 'zero-day', 'warehouse-leaks', '4chan', '8kun', '8chan', '4chan', '4ch', 'bbc', 'tentacle', 'anal', 'milf','brazzers', 'pornhub', 'xvideos', 'redtube', 'youjizz', 'xnxx', 'pornhub', 'xvideos', 'redtube', 'youjizz', 'xnxx'
];

async function scanContent(content) {
    const lowerContent = content.toLowerCase();

    // 1. Keyword Check (Simple heuristic)
    for (const word of FORBIDDEN_WORDS) {
        if (lowerContent.includes(word)) {
            return { flag: true, reason: `violates structural policy: ${word}` };
        }
    }

    // 2. Link Check (Anti-viral/Malware)
    const linkRegex = /https?:\/\/[^\s]+/g;
    const links = content.match(linkRegex);
    if (links) {
        // Here we could integrate a real API like Google Safe Browsing
        // For now, we'll flag excessive links as spam
        if (links.length > 3) {
            return { flag: true, reason: 'excessive links detected (potential spam/malware)' };
        }
    }

    return { flag: false };
}

async function handleAutoBan(db, userId, reason, type = 'temporary') {
    const expiresAt = type === 'temporary'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        : null;

    await db.run(
        'INSERT INTO bans (user_id, reason, ban_type, expires_at) VALUES (?, ?, ?, ?)',
        [userId, reason, type, expiresAt]
    );

    console.log(`// guardian system: automated ${type} ban issued for user ${userId}`);
}

async function createPost(db, userId, rawContent) {
    const content = xss(rawContent);

    // Run moderation scan
    const moderation = await scanContent(content);

    if (moderation.flag) {
        // issue auto-ban for serious violations
        await handleAutoBan(db, userId, moderation.reason, 'temporary');
        throw new Error(`structural violation detected: ${moderation.reason}. account temp-banned for 24h.`);
    }

    const result = await db.run(
        'INSERT INTO posts (user_id, content) VALUES (?, ?)',
        [userId, content]
    );

    return { id: result.lastID, content };
}

async function getPosts(db) {
    return await db.all(`
        SELECT posts.*, users.username, users.avatar_url 
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        WHERE posts.status = 'active' AND users.is_deleted = 0
        ORDER BY posts.created_at DESC
    `);
}

module.exports = { createPost, getPosts };
