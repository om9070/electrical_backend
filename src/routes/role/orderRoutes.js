const express = require('express');
const router = express.Router();

const {
  placeOrder,
  getRoleOrders,
  getRoleOrderById,
  updateOrderStatus,
  cancelRoleOrder,
} = require('../../controllers/role/orderController');
const { protectRole } = require('../../middlewares/role/roleAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const {
  createDeliverySchema,
  updateDeliveryStatusSchema,
  deliveryQuerySchema,
} = require('../../validations/role/deliveryValidation');

// All role order routes require authentication
router.use(protectRole);

// Place Order (from cart or custom items array)
router.post('/', validate(createDeliverySchema, 'body'), placeOrder);
router.post('/place', validate(createDeliverySchema, 'body'), placeOrder);
router.post('/checkout', validate(createDeliverySchema, 'body'), placeOrder);

// Get Order History / Orders List
router.get('/', validate(deliveryQuerySchema, 'query'), getRoleOrders);
router.get('/my-orders', validate(deliveryQuerySchema, 'query'), getRoleOrders);

// Single Order details by ID
router.get('/:id', getRoleOrderById);

// Update status / cancel
router.put('/:id/status', validate(updateDeliveryStatusSchema, 'body'), updateOrderStatus);
router.patch('/:id/status', validate(updateDeliveryStatusSchema, 'body'), updateOrderStatus);
router.put('/:id/cancel', cancelRoleOrder);
router.patch('/:id/cancel', cancelRoleOrder);

module.exports = router;
