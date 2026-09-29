const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Category name is required',
    'string.empty': 'Category name cannot be empty',
  }),
  description: Joi.string().allow('').optional(),
  image: Joi.any().optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().allow('').optional(),
  image: Joi.any().optional(),
  status: Joi.number().valid(0, 1).optional().messages({
    'any.only': 'Status must be 0 (Inactive) or 1 (Active)',
  }),
});

const toggleCategoryStatusSchema = Joi.object({
  _id: Joi.string().trim().required(),
  status: Joi.number().valid(0, 1).required().messages({
    'any.required': 'Status is required',
    'any.only': 'Status must be 0 (Inactive) or 1 (Active)',
  }),
});

const categoryQuerySchema = Joi.object({
  search: Joi.string().trim().optional(),
  status: Joi.number().valid(0, 1).optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  toggleCategoryStatusSchema,
  categoryQuerySchema,
};
