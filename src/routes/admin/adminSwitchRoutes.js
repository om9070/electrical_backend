const express = require('express');
const router = express.Router();

const { switchAdminToRole, switchRoleToAdmin } = require('../../controllers/admin/adminSwitchController');
const { protectAdmin, protectRoleMode } = require('../../middlewares/admin/adminAuthMiddleware');

// POST /api/v1/admin/switch-role
router.post('/switch-role', protectAdmin, switchAdminToRole);

// POST /api/v1/admin/switch-admin
router.post('/switch-admin', protectRoleMode, switchRoleToAdmin);

module.exports = router;
