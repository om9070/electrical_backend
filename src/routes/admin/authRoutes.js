const express = require('express');
const router = express.Router();

const { login } = require('../../controllers/admin/authController');
const { protectAdmin } = require('../../middlewares/admin/adminAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const { loginSchema } = require('../../validations/admin/authValidation');
const { adminLoginRateLimiter } = require('../../middlewares/admin/adminRateLimiter');

// Admin Login (Rate limited: 10 attempts / 10 min)
router.post('/login', adminLoginRateLimiter, validate(loginSchema), login);

// router.post('/create-user', protectAdmin, validate(createUserWithRoleSchema), createUserWithRole);

module.exports = router;
