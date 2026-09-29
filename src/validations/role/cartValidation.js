const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addToCartSchema = Joi.object({
  productId: Joi.string().regex(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Product ID format',
    'any.required': 'Product ID is required',
  }),
  quantity: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'Quantity must be at least 1',
  }),
  unit: Joi.string().required().messages({
    'type.min': 'require unit'
  })
});

const updateCartItemSchema = Joi.object({
  productId: Joi.string().regex(objectIdPattern).optional(),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required',
  }),
  unit: Joi.string().required().messages({
    'type.min': 'require unit'
  })
});

const removeItemSchema = Joi.object({
  productId: Joi.string().regex(objectIdPattern).optional(),
});

module.exports = {
  addToCartSchema,
  updateCartItemSchema,
  removeItemSchema,
};
