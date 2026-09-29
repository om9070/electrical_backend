const Joi = require('joi');

const roleQuerySchema = Joi.object({
  search: Joi.string().trim().optional(),
  status: Joi.number().valid(0, 1).optional(),
});

const roleLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': 'Email is required',
    'string.email': 'Invalid email address',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    'any.required': 'Old password is required',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'any.required': 'New password is required',
    'string.min': 'New password must be at least 6 characters long',
  }),
});

module.exports = {
  roleQuerySchema,
  roleLoginSchema,
  updatePasswordSchema,
};

