const jwt = require('jsonwebtoken');
const Admin = require('../../models/admin/Admin');
const Role = require('../../models/role/Role');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_ravi_electricals_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * @desc    Switch Admin to Role mode
 * @route   POST /api/admin/switch-role
 * @route   POST /api/v1/admin/switch-role
 * @access  Private (Admin Mode)
 */
const switchAdminToRole = async (req, res, next) => {
  try {
    const admin = req.admin || req.user;

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated admin not found',
      });
    }

    const roleId = admin.roleId || admin.RoleId;

    if (!roleId) {
      return res.status(404).json({
        success: false,
        message: 'No role assigned to this admin account',
      });
    }

    const role = await Role.findById(roleId).select('-password -rawPassword');

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Referenced role does not exist',
      });
    }

    if (role.status === 0) {
      return res.status(403).json({
        success: false,
        message: `Assigned role '${role.roleName || role.name}' is currently blocked (status 0)`,
      });
    }

    const payload = {
      id: admin._id.toString(),
      sub: admin._id.toString(),
      adminId: admin._id.toString(),
      roleId: role._id.toString(),
      userType: 'ADMIN',
      mode: 'ROLE',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      success: true,
      message: 'Switched to role successfully',
      token,
      mode: 'ROLE',
      adminId: admin._id.toString(),
      role: {
        _id: role._id.toString(),
        name: role.roleName || role.name,
        roleName: role.roleName,
        roleTitle: role.roleTitle,
        permissions: role.permissions || [],
      },
    });
  } catch (error) {
    console.error('switchAdminToRole error:', error);
    next(error);
  }
};

/**
 * @desc    Switch Role mode back to Admin mode
 * @route   POST /api/admin/switch-admin
 * @route   POST /api/v1/admin/switch-admin
 * @access  Private (Role Mode Token)
 */
const switchRoleToAdmin = async (req, res, next) => {
  try {
    const decoded = req.decodedToken;
    const admin = req.admin || req.user;

    if (!decoded || decoded.mode !== 'ROLE') {
      return res.status(409).json({
        success: false,
        message: 'Current token is not in Role mode',
      });
    }

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Original Admin identity not found',
      });
    }

    const payload = {
      id: admin._id.toString(),
      sub: admin._id.toString(),
      adminId: admin._id.toString(),
      userType: 'ADMIN',
      mode: 'ADMIN',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      success: true,
      message: 'Switched to admin successfully',
      token,
      mode: 'ADMIN',
      adminId: admin._id.toString(),
    });
  } catch (error) {
    console.error('switchRoleToAdmin error:', error);
    next(error);
  }
};

module.exports = {
  switchAdminToRole,
  switchRoleToAdmin,
};
