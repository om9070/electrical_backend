const express = require('express');
const router = express.Router();

const {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  toggleRoleStatus,
  resetRolePassword,
  toggleRoleLockout,
} = require('../../controllers/admin/roleController');
const { protectAdmin } = require('../../middlewares/admin/adminAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const {
  createRoleSchema,
  updateRoleSchema,
  toggleRoleStatusSchema,
  resetRolePasswordSchema,
  toggleLockoutSchema,
} = require('../../validations/admin/roleValidation');

router.use(protectAdmin);

router
  .route('/')
  .post(validate(createRoleSchema), createRole)
  .get(getRoles);

router
  .route('/:id')
  .get(getRoleById)
  .put(validate(updateRoleSchema), updateRole)
  .delete(deleteRole);

router.patch('/:id/status', validate(toggleRoleStatusSchema), toggleRoleStatus);
router.patch('/:id/reset-password', validate(resetRolePasswordSchema), resetRolePassword);
router.patch('/:id/lockout', validate(toggleLockoutSchema), toggleRoleLockout);

module.exports = router;

