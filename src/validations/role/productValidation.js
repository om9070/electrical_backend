const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const specItemSchema = Joi.object({
  key: Joi.string().trim().required(),
  value: Joi.string().trim().required(),
});

const variantItemSchema = Joi.object({
  unit: Joi.string().trim().required().messages({
    'any.required': 'Variant unit is required',
    'string.empty': 'Variant unit cannot be empty',
  }),
  price: Joi.alternatives().try(
    Joi.number().min(0),
    Joi.string().custom((val, helpers) => {
      const n = Number(val);
      if (isNaN(n) || n < 0) return helpers.error('number.min');
      return n;
    })
  ).required().messages({
    'any.required': 'Variant price is required',
    'number.min': 'Variant price must be greater than or equal to 0',
  }),
});

const createProductSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Product name is required',
    'string.empty': 'Product name cannot be empty',
  }),
  sku: Joi.string().trim().required().messages({
    'any.required': 'SKU is required',
    'string.empty': 'SKU cannot be empty',
  }),
  brand: Joi.string().trim().allow('').optional(),
  warranty: Joi.string().trim().allow('').optional(),
  category: Joi.string().regex(objectIdPattern).required().messages({
    'any.required': 'Category ID is required',
    'string.pattern.base': 'Category ID must be a valid MongoDB ObjectId',
  }),
  price: Joi.alternatives().try(
    Joi.number().min(0),
    Joi.string().custom((val, helpers) => {
      const n = Number(val);
      if (isNaN(n) || n < 0) return helpers.error('number.min');
      return n;
    })
  ).optional().messages({
    'number.min': 'Price must be greater than or equal to 0',
  }),
  unit: Joi.string().trim().optional().default('piece'),
  variants: Joi.alternatives()
    .try(
      Joi.array().items(variantItemSchema),
      Joi.string().allow('')
    )
    .optional(),
  description: Joi.string().allow('').optional(),
  images: Joi.any().optional(),
  image: Joi.any().optional(),
  existingImages: Joi.any().optional(),
  removedImages: Joi.any().optional(),
  status: Joi.alternatives().try(
    Joi.number().valid(0, 1),
    Joi.string().valid('0', '1')
  ).optional().default(1).messages({
    'any.only': 'Status must be 0 (Inactive) or 1 (Active)',
  }),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().optional(),
  sku: Joi.string().trim().optional(),
  brand: Joi.string().trim().allow('').optional(),
  warranty: Joi.string().trim().allow('').optional(),
  category: Joi.string().regex(objectIdPattern).optional(),
  price: Joi.alternatives().try(
    Joi.number().min(0),
    Joi.string().custom((val, helpers) => {
      const n = Number(val);
      if (isNaN(n) || n < 0) return helpers.error('number.min');
      return n;
    })
  ).optional(),
  unit: Joi.string().trim().optional(),
  variants: Joi.alternatives()
    .try(
      Joi.array().items(variantItemSchema),
      Joi.string().allow('')
    )
    .optional(),
  description: Joi.string().allow('').optional(),
  specs: Joi.alternatives()
    .try(
      Joi.array().items(specItemSchema),
      Joi.string().allow('')
    )
    .optional(),
  images: Joi.any().optional(),
  image: Joi.any().optional(),
  existingImages: Joi.any().optional(),
  removedImages: Joi.any().optional(),
  status: Joi.alternatives().try(
    Joi.number().valid(0, 1),
    Joi.string().valid('0', '1')
  ).optional().messages({
    'any.only': 'Status must be 0 (Inactive) or 1 (Active)',
  }),
});

const toggleProductStatusSchema = Joi.object({
  _id: Joi.string().trim().optional(),
  status: Joi.number().valid(0, 1).required().messages({
    'any.required': 'Status is required',
    'any.only': 'Status must be 0 (Inactive) or 1 (Active)',
  }),
});

const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  category: Joi.string().regex(objectIdPattern).optional(),
  brand: Joi.string().trim().optional(),
  search: Joi.string().trim().optional(),
  status: Joi.number().valid(0, 1).optional(),
});

const categoryWiseProductQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  category: Joi.string().trim().optional(),
  search: Joi.string().trim().optional(),
  productLimit: Joi.number().integer().min(1).max(100).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  toggleProductStatusSchema,
  productQuerySchema,
  categoryWiseProductQuerySchema,
};
