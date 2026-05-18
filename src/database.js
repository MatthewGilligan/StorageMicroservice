const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create/connect to database
const dbPath = path.join(__dirname, '../data/storage.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
function initializeDatabase() {
    db.serialize(() => {
        // Create user_actions table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                action_id TEXT UNIQUE NOT NULL,
                session_id TEXT,
                timestamp TEXT NOT NULL,
                action_type TEXT,
                action_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create index for faster queries
        db.run(`
            CREATE INDEX IF NOT EXISTS idx_user_timestamp 
            ON user_actions(user_id, timestamp)
        `);

        console.log('Database initialized successfully');
    });
}

// Store an action
function storeAction(userId, actionId, sessionId, timestamp, actionData) {
    return new Promise((resolve, reject) => {
        // Parse action data to extract action type
        let actionType = 'UNKNOWN';
        try {
            const parsedData = JSON.parse(actionData);
            actionType = parsedData.action || parsedData.actionType || 'UNKNOWN';
        } catch (e) {
            // If can't parse, keep as UNKNOWN
        }

        const sql = `
            INSERT INTO user_actions (user_id, action_id, session_id, timestamp, action_type, action_data)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(sql, [userId, actionId, sessionId, timestamp, actionType, actionData], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    actionId: actionId
                });
            }
        });
    });
}

// Get user's action history
function getUserHistory(userId, limit = 100) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT action_id, timestamp, action_type, action_data
            FROM user_actions
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `;

        db.all(sql, [userId, limit], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Get a specific action by ID
function getActionById(userId, actionId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT *
            FROM user_actions
            WHERE user_id = ? AND action_id = ?
        `;

        db.get(sql, [userId, actionId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

module.exports = {
    initializeDatabase,
    storeAction,
    getUserHistory,
    getActionById,
    db
};
