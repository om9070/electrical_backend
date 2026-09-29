const express = require('express');
const router = express.Router();

const {
  getAdminOrders,
  getAdminOrderById,
  takeAdminOrderAction,
  deleteAdminOrder,
  getAdminOrderStats,
} = require('../../controllers/admin/orderController');
const { protectAdmin } = require('../../middlewares/admin/adminAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const {
  orderQuerySchema,
  updateOrderStatusSchema,
} = require('../../validations/admin/orderValidation');

// Protect all admin order routes
router.use(protectAdmin);

// Analytics Stats route (must be before /:id)
router.get('/stats', getAdminOrderStats);

// List Orders & Actions
router.get('/', validate(orderQuerySchema, 'query'), getAdminOrders);

// Take Action / Update Order Status
router.put('/:id/action', validate(updateOrderStatusSchema, 'body'), takeAdminOrderAction);
router.put('/:id/status', validate(updateOrderStatusSchema, 'body'), takeAdminOrderAction);
router.patch('/:id/status', validate(updateOrderStatusSchema, 'body'), takeAdminOrderAction);

// Single Order by ID & Delete
router.get('/:id', getAdminOrderById);
router.delete('/:id', deleteAdminOrder);

module.exports = router;
