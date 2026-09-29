const bcryptjs = require('bcryptjs');
const Admin = require('../../models/admin/Admin');
const Role = require('../../models/role/Role');
const jwt = require('jsonwebtoken');
const MAX_LOGIN_ATTEMPTS = 15;
const LOCK_TIME = 10 * 60 * 1000;


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret_ravi_electricals_jwt_key_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

/**
 * @desc    Admin Login
 * @route   POST /api/v1/admin/auth/login
 * @access  Public (Rate limited)
 */
// const login = async (req, res, next) => {
//   try {
//     const { email, password } = req.body;

//     const admin = await Admin.findOne({ email }).populate('role');
//     if (!admin) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid email or password',
//       });
//     }

//     if (admin.status === 0) {
//       return res.status(403).json({
//         success: false,
//         message: 'Admin account is blocked (status 0). Please contact super admin.',
//       });
//     }

//     const isMatch = await admin.matchPassword(password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid email or password',
//       });
//     }

//     const token = generateToken(admin._id);

//     return res.status(200).json({
//       success: true,
//       message: 'Admin login successful',
//       token,
//       data: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//         role: admin.role,
//         status: admin.status,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };



const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check whether account is locked
    if (
      admin.lockedUntil &&
      admin.lockedUntil > new Date()
    ) {
      return res.status(429).json({
        success: false,
        message: "Account is temporarily locked. Try again later.",
      });
    }

    // If lock has expired
    if (
      admin.lockedUntil &&
      admin.lockedUntil <= new Date()
    ) {
      admin.loginAttempts = 0;
      admin.lockedUntil = null;

      await admin.save();
    }

    // Check password
    const isPasswordValid = await bcryptjs.compare(
      password,
      admin.password
    );

    // Wrong password
    if (!isPasswordValid) {
      admin.loginAttempts += 1;

      if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        admin.lockedUntil = new Date(
          Date.now() + LOCK_TIME
        );
      }

      await admin.save();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Successful login
    admin.loginAttempts = 0;
    admin.lockedUntil = null;

    await admin.save();

    // Generate JWT here
    const token = generateToken(admin._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      name: admin.name,
      email: admin.email,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  login
};
