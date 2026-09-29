const Role = require('../../models/role/Role');

/**
 * Format Role object for Admin response.
 * If user has NOT logged in yet (isFirstLogin === true), admin can see rawPassword.
 * Once user logs in for the first time (isFirstLogin === false), password is hidden (null).
 */
const formatRoleForAdmin = (role) => {
  const roleObj = role.toObject ? role.toObject() : { ...role };
  if (roleObj.isFirstLogin && roleObj.rawPassword) {
    roleObj.password = roleObj.rawPassword;
  } else {
    roleObj.password = null;
    delete roleObj.rawPassword;
  }
  return roleObj;
};

/**
 * @desc    Create a Role & Staff Member
 * @route   POST /api/v1/admin/roles
 * @access  Private (Admin)
 */
const createRole = async (req, res, next) => {
  try {
    const { roleName, name, roleTitle, personName, email, mobile, password, address, description, status } = req.body;

    const rName = (roleName || name || '').trim();
    const rTitle = (roleTitle || personName || 'Ravi Electricals Staff').trim();

    if (email && email.trim()) {
      const existingEmail = await Role.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: `Role with email '${email}' already exists`,
        });
      }
    }

    const plainPassword = password || 'Ravi#' + Math.random().toString(36).slice(-6);

    const role = await Role.create({
      roleName: rName,
      roleTitle: rTitle,
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      password: plainPassword,
      rawPassword: plainPassword,
      address: address.trim(),
      description: description.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Role and staff member created successfully',
      data: formatRoleForAdmin(role),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all Roles
 * @route   GET /api/v1/admin/roles
 * @access  Private (Admin)
 */
const getRoles = async (req, res, next) => {
  try {
    const { search, filter, page = 1, limit = 10 } = req.query;

    const query = {};

    if (search && search.trim() !== "") {
      query.$or = [
        { roleName: { $regex: search, $options: 'i' } },
        { roleTitle: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { personName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    if (filter) {
      query.status = filter;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const total = await Role.countDocuments(query);
    const skip = (pageNum - 1) * limitNum;
    const limitValue = limitNum > 0 ? limitNum : 10;

    const roles = await Role.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitValue);

    return res.status(200).json({
      success: true,
      data: roles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limitValue),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single Role by ID
 * @route   GET /api/v1/admin/roles/:id
 * @access  Private (Admin)
 */
const getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: formatRoleForAdmin(role),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Role
 * @route   PUT /api/v1/admin/roles/:id
 * @access  Private (Admin)
 */
const updateRole = async (req, res, next) => {
  try {
    const { roleName, name, roleTitle, personName, email, mobile, password, address, description, status } = req.body;

    let role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const rName = roleName || name;
    if (rName !== undefined) role.roleName = rName.trim();

    const rTitle = roleTitle || personName;
    if (rTitle !== undefined) role.roleTitle = rTitle.trim();

    if (email && email.toLowerCase().trim() !== role.email) {
      const existingEmail = await Role.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail && existingEmail._id.toString() !== role._id.toString()) {
        return res.status(400).json({
          success: false,
          message: `Role with email '${email}' already exists`,
        });
      }
      role.email = email.toLowerCase().trim();
    }

    if (mobile !== undefined) role.mobile = mobile.trim();
    if (address !== undefined) role.address = address.trim();
    if (description !== undefined) role.description = description;
    if (status !== undefined) role.status = status;


    if (password && password.trim()) {
      role.password = password.trim();
      role.rawPassword = password.trim();
      role.isFirstLogin = true;
      role.loginAttempts = 0;
      role.lockedUntil = null;
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: formatRoleForAdmin(role),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Role
 * @route   DELETE /api/v1/admin/roles/:id
 * @access  Private (Admin)
 */
const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    await role.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Block or Unblock Role (0 for block, 1 for unblock)
 * @route   PATCH /api/v1/admin/roles/:id/status
 * @access  Private (Admin)
 */
const toggleRoleStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 0 = Block, 1 = Unblock

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    role.status = status;
    await role.save();

    const statusText = status === 1 ? 'unblocked' : 'blocked';

    return res.status(200).json({
      success: true,
      message: `Role has been ${statusText} successfully`,
      data: formatRoleForAdmin(role),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin Reset Role Password
 * @route   PATCH /api/v1/admin/roles/:id/reset-password
 * @access  Private (Admin)
 */
const resetRolePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const resetPass = (newPassword && newPassword.trim())
      ? newPassword.trim()
      : 'Ravi#' + Math.random().toString(36).slice(-6);

    role.password = resetPass;
    role.rawPassword = resetPass;
    role.isFirstLogin = true;
    role.loginAttempts = 0;
    role.lockedUntil = null;

    await role.save();

    return res.status(200).json({
      success: true,
      message: 'Role password has been reset successfully',
      resetPassword: resetPass,
      data: formatRoleForAdmin(role),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin Lock or Unlock Role Login Attempts
 * @route   PATCH /api/v1/admin/roles/:id/lockout
 * @access  Private (Admin)
 */
const toggleRoleLockout = async (req, res, next) => {
  try {

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }


    // unlock or reset
    role.loginAttempts = 0;
    role.lockedUntil = null;
    await role.save();


    return res.status(200).json({
      success: true,
      message: `Role login attempts have been reset successfully`,
      data: formatRoleForAdmin(role),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  toggleRoleStatus,
  resetRolePassword,
  toggleRoleLockout,
};


