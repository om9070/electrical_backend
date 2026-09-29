const jwt = require('jsonwebtoken');
const Admin = require('../../models/admin/Admin');
const Role = require('../../models/role/Role');

const protectRole = async (req, res, next) => {
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
    // Check if token explicitly specifies ROLE mode from Admin switch
    if (decoded.mode === 'ROLE') {
      const adminId = decoded.adminId || decoded.id;
      const roleId = decoded.roleId;

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin user no longer exists',
        });
      }

      const targetRoleId = roleId || admin.roleId || admin.RoleId;
      if (!targetRoleId) {
        return res.status(404).json({
          success: false,
          message: 'No role linked to admin account',
        });
      }

      const role = await Role.findById(targetRoleId).select('-password');
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Linked role no longer exists',
        });
      }

      if (role.status === 0) {
        return res.status(403).json({
          success: false,
          message: `Your assigned role '${role.name}' is currently blocked (status 0).`,
        });
      }

      req.user = role;
      req.admin = admin;
      return next();
    }

    // First check if token belongs to a direct Role user
    let user = await Role.findById(decoded.id).select('-password');
    if (user) {
      if (user.status === 0) {
        return res.status(403).json({
          success: false,
          message: `Your role account '${user.name}' is currently blocked (status 0).`,
        });
      }
      req.user = user;
      return next();
    }

    // Fallback: check if token belongs to an Admin user
    user = await Admin.findById(decoded.id).populate('roleId').select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    const linkedRole = user.roleId || user.RoleId;
    if (linkedRole && linkedRole.status === 0) {
      return res.status(403).json({
        success: false,
        message: `Your assigned role is currently blocked (status 0).`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid or expired token',
    });
  }
};

module.exports = { protectRole };

