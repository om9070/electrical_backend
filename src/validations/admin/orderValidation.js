const Joi = require('joi');

const orderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string()
    .valid('pending', 'assigned', 'out_for_delivery', 'delivered', 'cancelled')
    .optional(),
  paymentStatus: Joi.string()
    .valid('pending', 'paid', 'partially_paid')
    .optional(),
  search: Joi.string().trim().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

const updateOrderStatusSchema = Joi.object({
  deliveryStatus: Joi.string()
    .valid('pending', 'out_for_delivery', 'delivered', 'cancelled')
    .required(),
  paymentStatus: Joi.string().valid('pending', 'paid', 'partially_paid').optional(),
  amountPaid: Joi.number().min(0).optional(),
  paymentMethod: Joi.string().valid('cash', 'upi', 'card', 'credit', 'other').optional(),
  deliveryPerson: Joi.object({
    personName: Joi.string().trim().allow('').optional(),
    contactNumber: Joi.string().trim().allow('').optional(),
    notes: Joi.string().trim().allow('').optional(),
  }).optional(),
  manualNotes: Joi.string().trim().allow('').optional(),
  adminNotes: Joi.string().trim().allow('').optional(),
});

module.exports = {
  orderQuerySchema,
  updateOrderStatusSchema,
};
