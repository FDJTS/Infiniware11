const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function initDB() {
    const db = await open({
        filename: process.env.DATABASE_PATH || './infiniware.db',
        driver: sqlite3.Database
    });

    console.log('// infiniware db system: initializing structural integrity');

    // Users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password TEXT,
            github_id TEXT UNIQUE,
            avatar_url TEXT,
            role TEXT DEFAULT 'user',
            is_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_deleted INTEGER DEFAULT 0
        )
    `);

    // Posts table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active', -- active, flagged, deleted
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    // Bans table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS bans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            reason TEXT NOT NULL,
            ban_type TEXT NOT NULL, -- temporary, permanent
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            active INTEGER DEFAULT 1,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    return db;
}

module.exports = { initDB };
