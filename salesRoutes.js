// ============================================================
// Sales Routes
// Maps URLs to the functions in salesController.js
// (All sales/reporting routes are admin-only)
// ============================================================

const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { requireAdmin } = require('../middleware/auth');

router.get('/dashboard', requireAdmin, salesController.getDashboardStats);
router.get('/by-date', requireAdmin, salesController.getSalesByDate);
router.get('/history', requireAdmin, salesController.getDailyHistory);

module.exports = router;
