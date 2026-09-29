const express = require('express');
const router = express.Router();

const { getCounts } = require('../../controllers/admin/dashboardController');
const { protectAdmin } = require('../../middlewares/admin/adminAuthMiddleware');

router.get('/', protectAdmin, getCounts);

module.exports = router;
