const {
  createManualDelivery,
  getDeliveries,
  getDeliveryById,
  updateDeliveryStatus,
  cancelDelivery,
} = require('./deliveryController');

module.exports = {
  placeOrder: createManualDelivery,
  getRoleOrders: getDeliveries,
  getRoleOrderById: getDeliveryById,
  updateOrderStatus: updateDeliveryStatus,
  cancelRoleOrder: cancelDelivery,
};
