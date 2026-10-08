// ============================================================
// Coffee Shop Ordering System - Main Server File
// ============================================================
// This is the starting point of the whole backend.
// Run it with:  node server.js   (from inside the backend folder)
// Then open:    http://localhost:3000
// ============================================================

const express = require('express');
const session = require('express-session');
const path = require('path');

// Import our route files
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const salesRoutes = require('./routes/salesRoutes');
const accountRoutes = require('./routes/accountRoutes');
const refundRoutes = require('./routes/refundRoutes');

// This line also runs the connection check inside config/db.js
require('./config/db');

const app = express();
const PORT = 3000;

// ------------------------------------------------------------
// Middleware (things that run on every request)
// ------------------------------------------------------------

// Lets Express read JSON data sent from the frontend (fetch requests)
app.use(express.json());

// Sets up login sessions (stored in memory, which is fine since
// this app only runs locally inside the coffee shop)
app.use(session({
  secret: 'coffee-shop-secret-key-change-this-if-you-want',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000 // session lasts 8 hours (one work shift)
  }
}));

// Serves the frontend folder as plain static files
// e.g. frontend/login.html becomes http://localhost:3000/login.html
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ------------------------------------------------------------
// API Routes
// ------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/refunds', refundRoutes);

// ------------------------------------------------------------
// Start the server
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n☕ Coffee Shop Ordering System running at http://localhost:${PORT}`);
  console.log('   Login page: http://localhost:' + PORT + '/login.html\n');
});
