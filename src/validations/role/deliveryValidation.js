const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createDeliverySchema = Joi.object({
  customer: Joi.object({
    customerName: Joi.string().trim().optional(),
    mobile: Joi.string().trim().optional(),
    email: Joi.string().trim().email().allow('').optional(),
    fullAddress: Joi.string().trim().optional(),
    landmark: Joi.string().trim().allow('').optional(),
    city: Joi.string().trim().allow('').default('Latehar'),
    pinCode: Joi.string().trim().allow('').optional(),
  }).optional(),
  fromCart: Joi.boolean().default(false),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().regex(objectIdPattern).optional(),
        name: Joi.string().trim().optional(),
        sku: Joi.string().trim().allow('').optional(),
        unit: Joi.string().trim().allow('').default('piece'),
        quantity: Joi.number().integer().min(1).required(),
        unitPrice: Joi.number().min(0).optional(),
      })
    )
    .optional(),
  deliveryType: Joi.string().valid('manual', 'standard', 'express').default('manual'),
  deliveryPerson: Joi.object({
    personName: Joi.string().trim().allow('').optional(),
    contactNumber: Joi.string().trim().allow('').optional(),
    notes: Joi.string().trim().allow('').optional(),
  }).optional(),
  paymentDetails: Joi.object({
    method: Joi.string().valid('cash', 'upi', 'card', 'credit', 'other').default('cash'),
    status: Joi.string().valid('pending', 'paid', 'partially_paid').default('pending'),
    amountPaid: Joi.number().min(0).default(0),
    totalAmount: Joi.number().min(0).optional(),
  }).optional(),
  manualNotes: Joi.string().trim().allow('').optional(),
});

const updateDeliveryStatusSchema = Joi.object({
  deliveryStatus: Joi.string()
    .valid('pending', 'assigned', 'out_for_delivery', 'delivered', 'cancelled')
    .optional(),
  paymentStatus: Joi.string().valid('pending', 'paid', 'partially_paid').optional(),
  amountPaid: Joi.number().min(0).optional(),
  deliveryPerson: Joi.object({
    personName: Joi.string().trim().allow('').optional(),
    contactNumber: Joi.string().trim().allow('').optional(),
    notes: Joi.string().trim().allow('').optional(),
  }).optional(),
  manualNotes: Joi.string().trim().allow('').optional(),
});

const deliveryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string()
    .valid('pending', 'assigned', 'out_for_delivery', 'delivered', 'cancelled')
    .optional(),
  search: Joi.string().trim().optional(),
});

module.exports = {
  createDeliverySchema,
  updateDeliveryStatusSchema,
  deliveryQuerySchema,
};
