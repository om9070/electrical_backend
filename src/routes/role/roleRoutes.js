const express = require('express');
const router = express.Router();

const {
  roleLogin,
  updateOwnPassword,
  getActiveRoles,
  getMyRole,
} = require('../../controllers/role/roleController');
const { protectRole } = require('../../middlewares/role/roleAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const {
  roleLoginSchema,
  updatePasswordSchema,
} = require('../../validations/role/roleValidation');

router.post('/login', validate(roleLoginSchema), roleLogin);
router.put('/update-password', protectRole, validate(updatePasswordSchema), updateOwnPassword);
router.get('/', protectRole, getActiveRoles);
router.get('/my-role', protectRole, getMyRole);

module.exports = router;

