// ============================================================
// Database Connection Setup
// ============================================================
// This file connects our Node.js app to the MySQL database
// that is running inside XAMPP.
//
// We use a "connection pool" instead of a single connection.
// A pool keeps several connections ready to use, which is
// faster and safer when many requests come in (e.g. several
// staff using the POS at the same time).
// ============================================================

const mysql = require('mysql2');

// EDIT THESE VALUES if your XAMPP MySQL setup is different.
// By default, XAMPP's MySQL has:
//   host: localhost
//   user: root
//   password: '' (empty)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',            // change this if you set a MySQL root password in XAMPP
  database: 'coffee_shop_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // ---- TIMEZONE FIX (Philippines = UTC+8, no daylight saving) ----
  // dateStrings: return dates/times from MySQL as plain text like
  //   "2026-09-26 14:39:00"  instead of JavaScript Date objects.
  // JS Date objects get converted to UTC when sent to the browser
  // (that is what produced "2026-09-27T16:00:00.000Z"). Plain text
  // can never shift to another day.
  dateStrings: true,
  timezone: '+08:00'
});

// Make every MySQL connection use Philippine time. This decides what
// CURDATE(), DATE(created_at) and the displayed order time mean.
// (TIMESTAMP values are stored in UTC internally, so existing orders
// are NOT changed - they are just displayed in Philippine time.)
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+08:00'");
});

// We use the "promise" version of the pool so we can use
// async/await in our controllers instead of callbacks.
const db = pool.promise();

// Quick check on startup so you immediately know if the
// database connection works or not.
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Could not connect to MySQL database:', err.message);
    console.error('   Make sure XAMPP MySQL is running and the database "coffee_shop_db" exists.');
  } else {
    console.log('✅ Connected to MySQL database: coffee_shop_db');
    connection.release();
  }
});

module.exports = db;
