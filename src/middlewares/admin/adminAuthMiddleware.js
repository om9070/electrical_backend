const jwt = require('jsonwebtoken');
const Admin = require('../../models/admin/Admin');

const protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, admin token missing',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_ravi_electricals_jwt_key_2026');

    // Reject Role-mode tokens attempting to access normal Admin endpoints
    if (decoded.mode === 'ROLE') {
      return res.status(403).json({
        success: false,
        message: 'Cannot access admin resources while in Role mode. Please switch back to Admin mode.',
      });
    }

    const adminId = decoded.adminId || decoded.id || decoded.sub;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin user no longer exists',
      });
    }

    req.user = admin;
    req.admin = admin;
    req.tokenMode = decoded.mode || 'ADMIN';
    req.decodedToken = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid or expired admin token',
    });
  }
};

const protectRoleMode = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token missing',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_ravi_electricals_jwt_key_2026');

    if (decoded.mode !== 'ROLE') {
      return res.status(409).json({
        success: false,
        message: 'Token is not in Role mode',
      });
    }

    const adminId = decoded.adminId || decoded.id || decoded.sub;
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user no longer exists',
      });
    }

    req.user = admin;
    req.admin = admin;
    req.tokenMode = 'ROLE';
    req.decodedToken = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid or expired role mode token',
    });
  }
};

module.exports = { protectAdmin, protectRoleMode };

