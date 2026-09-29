const express = require('express');
const router = express.Router();

const {
  createManualDelivery,
  getDeliveries,
  getDeliveryById,
  updateDeliveryStatus,
  cancelDelivery,
} = require('../../controllers/role/deliveryController');
const { protectRole } = require('../../middlewares/role/roleAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const {
  createDeliverySchema,
  updateDeliveryStatusSchema,
  deliveryQuerySchema,
} = require('../../validations/role/deliveryValidation');

// All delivery/order routes require role authentication
router.use(protectRole);

// Place / Create Order (from active Cart or custom items array)
router.post('/', validate(createDeliverySchema, 'body'), createManualDelivery);
router.post('/place', validate(createDeliverySchema, 'body'), createManualDelivery);
router.post('/create', validate(createDeliverySchema, 'body'), createManualDelivery);

// Get Order History / Deliveries List
router.get('/', validate(deliveryQuerySchema, 'query'), getDeliveries);

// Single Order details by ID
router.get('/:id', getDeliveryById);

// Update Status / Cancel
router.put('/:id/status', validate(updateDeliveryStatusSchema, 'body'), updateDeliveryStatus);
router.patch('/:id/status', validate(updateDeliveryStatusSchema, 'body'), updateDeliveryStatus);
router.put('/:id/cancel', cancelDelivery);
router.patch('/:id/cancel', cancelDelivery);

module.exports = router;
