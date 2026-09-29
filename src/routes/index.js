const express = require('express');
const router = express.Router();

const adminRoutes = require('./admin');
const roleRoutes = require('./role');

// Admin Routes (mounted under /api/v1/admin)
router.use('/admin', adminRoutes);

// Role Routes (mounted under /api/v1/role)
router.use('/role', roleRoutes);

module.exports = router;
