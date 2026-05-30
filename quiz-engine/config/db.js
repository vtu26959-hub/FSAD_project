// =============================================
// config/db.js - MySQL Database Connection
// =============================================

const mysql = require('mysql2');

// Create a connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'rOOt1100',       // <-- Update with your MySQL password
    database: process.env.DB_NAME || 'quiz_engine',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promisify pool for async/await usage
const promisePool = pool.promise();

// Test the connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        return;
    }
    console.log('✅ MySQL connected successfully!');
    connection.release();
});

module.exports = promisePool;
