const Joi = require('joi');

const mobilePattern = /^[6-9]\d{9}$/;

const createRoleSchema = Joi.object({
  roleName: Joi.string().trim().min(2).optional(),
  name: Joi.string().trim().min(2).optional(),
  roleTitle: Joi.string().trim().min(2).optional(),
  personName: Joi.string().trim().min(2).optional(),
  email: Joi.string().email().lowercase().trim().allow('').optional().messages({
    'string.email': 'Please provide a valid email address',
  }),
  mobile: Joi.string().trim().regex(mobilePattern).required().messages({
    'any.required': 'Mobile number is required',
    'string.pattern.base': 'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9',
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
  }),
  address: Joi.string().trim().min(5).required().messages({
    'any.required': 'Full address is required',
    'string.min': 'Full address must be at least 5 characters long',
  }),
  description: Joi.string().allow('').optional(),
  status: Joi.number().valid(0, 1).optional().default(1).messages({
    'any.only': 'Status must be 0 (Block) or 1 (Unblock)',
  }),
}).or('roleName', 'name').or('roleTitle', 'personName');

const updateRoleSchema = Joi.object({
  roleName: Joi.string().trim().min(2).optional(),
  name: Joi.string().trim().min(2).optional(),
  roleTitle: Joi.string().trim().min(2).optional(),
  personName: Joi.string().trim().min(2).optional(),
  email: Joi.string().email().lowercase().trim().allow('').optional().messages({
    'string.email': 'Please provide a valid email address',
  }),
  mobile: Joi.string().trim().regex(mobilePattern).optional().messages({
    'string.pattern.base': 'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9',
  }),
  password: Joi.string().min(6).allow('').optional(),
  address: Joi.string().trim().min(5).optional(),
  description: Joi.string().allow('').optional(),
  status: Joi.number().valid(0, 1).optional().messages({
    'any.only': 'Status must be 0 (Block) or 1 (Unblock)',
  }),
}).min(1);

const toggleRoleStatusSchema = Joi.object({
  status: Joi.number().valid(0, 1).required().messages({
    'any.required': 'Status is required',
    'string.only': 'Status must be 0 (Block) or 1 (Unblock)',
  }),
});

const resetRolePasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).optional().messages({
    'string.min': 'New password must be at least 6 characters long',
  }),
});

const toggleLockoutSchema = Joi.object({
  action: Joi.string().valid('lock', 'unlock', 'reset').optional().default('unlock').messages({
    'any.only': 'Action must be lock, unlock, or reset',
  }),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  toggleRoleStatusSchema,
  resetRolePasswordSchema,
  toggleLockoutSchema,
};

