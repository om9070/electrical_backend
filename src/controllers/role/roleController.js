const jwt = require('jsonwebtoken');
const Role = require('../../models/role/Role');

const MAX_LOGIN_ATTEMPTS = 15;
const LOCK_TIME = 10 * 60 * 1000; // 10 minutes

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret_ravi_electricals_jwt_key_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

/**
 * @desc    Role User Login
 * @route   POST /api/v1/role/roles/login
 * @access  Public
 */
const roleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const role = await Role.findOne({ email: email.toLowerCase().trim() });
    if (!role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is blocked (status 0)
    if (role.status === 0) {
      return res.status(403).json({
        success: false,
        message: 'Role account is currently blocked (status 0). Please contact super admin.',
      });
    }

    // Check whether account is locked
    if (role.lockedUntil && role.lockedUntil > new Date()) {
      return res.status(429).json({
        success: false,
        message: 'Account is temporarily locked. Try again later.',
      });
    }

    // If lock has expired
    if (role.lockedUntil && role.lockedUntil <= new Date()) {
      role.loginAttempts = 0;
      role.lockedUntil = null;
      await role.save();
    }

    // Check password
    const isPasswordValid = await role.matchPassword(password);

    // Wrong password
    if (!isPasswordValid) {
      role.loginAttempts += 1;

      if (role.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        role.lockedUntil = new Date(Date.now() + LOCK_TIME);
      }

      await role.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Successful login -> Reset login attempts and lock status
    role.loginAttempts = 0;
    role.lockedUntil = null;

    // FIRST TIME LOGIN REQUIREMENT:
    // If it's the first time role is logging in, admin can no longer get rawPassword
    if (role.isFirstLogin) {
      role.isFirstLogin = false;
      role.rawPassword = null;
    }

    await role.save();

    const token = generateToken(role._id);

    return res.status(200).json({
      success: true,
      message: 'Role login successful',
      data: {
        token,
        id: role._id,
        roleName: role.roleName,
        roleTitle: role.roleTitle,
        email: role.email,
        mobile: role.mobile,
        address: role.address,
        description: role.description,
        status: role.status,
      },
    });
  } catch (error) {
    console.error('Role login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * @desc    Role User Update Own Password
 * @route   PUT /api/v1/role/roles/update-password
 * @access  Private (Role User)
 */
const updateOwnPassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const role = await Role.findById(req.user._id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role user not found',
      });
    }

    const isMatch = await role.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    role.password = newPassword;
    role.rawPassword = null;
    role.isFirstLogin = false;

    await role.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active/unblocked roles for Role users
 * @route   GET /api/v1/role/roles
 * @access  Private (Role User)
 */
const getActiveRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({ status: 1 }).select('-password -rawPassword').sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get assigned role details of logged-in user
 * @route   GET /api/v1/role/my-role
 * @access  Private (Role User)
 */
const getMyRole = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'No role assigned to current user',
      });
    }

    return res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  roleLogin,
  updateOwnPassword,
  getActiveRoles,
  getMyRole,
};

