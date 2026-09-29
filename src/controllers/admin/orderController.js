const Delivery = require('../../models/role/Delivery');

/**
 * @desc    Get all orders/deliveries for Admin (with search, filter, and pagination)
 * @route   GET /api/v1/admin/orders
 * @route   GET /api/v1/admin/deliveries
 * @access  Private (Admin)
 */
const getAdminOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const { status, paymentStatus, search, startDate, endDate } = req.query;

    let query = {};

    if (status) {
      query.deliveryStatus = status;
    }

    if (paymentStatus) {
      query['paymentDetails.status'] = paymentStatus;
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { deliveryNumber: searchRegex },
        { 'customer.customerName': searchRegex },
        { 'customer.mobile': searchRegex },
        { 'customer.fullAddress': searchRegex },
        { 'deliveryPerson.personName': searchRegex },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Delivery.countDocuments(query);
    const orders = await Delivery.find(query)
      .populate('roleUser', 'roleName roleTitle email mobile')
      .populate('items.product', 'name sku brand images price unit')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order/delivery details by ID (Admin)
 * @route   GET /api/v1/admin/orders/:id
 * @route   GET /api/v1/admin/deliveries/:id
 * @access  Private (Admin)
 */
const getAdminOrderById = async (req, res, next) => {
  try {
    const order = await Delivery.findById(req.params.id)
      .populate('roleUser', 'roleName roleTitle email mobile address')
      .populate('items.product', 'name sku brand images price unit category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order record not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Take action on order/delivery (Update Status, Assign Person, Payment Status)
 * @route   PUT /api/v1/admin/orders/:id/action
 * @route   PUT /api/v1/admin/orders/:id/status
 * @route   PUT /api/v1/admin/deliveries/:id/status
 * @access  Private (Admin)
 */
const takeAdminOrderAction = async (req, res, next) => {
  try {
    const deliveryStatus = req.body.deliveryStatus || req.body.status;
    console.log(deliveryStatus, "llll")
    const order = await Delivery.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order record not found',
      });
    }

    if (deliveryStatus) {
      order.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'out_for_delivery' && !order.dispatchDate) {
        order.dispatchDate = new Date();
      }
      if (deliveryStatus === 'delivered') {
        order.deliveryDate = new Date();
        if (!order.dispatchDate) {
          order.dispatchDate = new Date();
        }
      }
    }

    await order.save();

    await order.populate([
      { path: 'roleUser', select: 'roleName roleTitle email mobile' },
      { path: 'items.product', select: 'name sku brand images' },
    ]);

    return res.status(200).json({
      success: true,
      message: `Order status updated to '${order.deliveryStatus}' successfully`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete order/delivery record (Admin)
 * @route   DELETE /api/v1/admin/orders/:id
 * @route   DELETE /api/v1/admin/deliveries/:id
 * @access  Private (Admin)
 */
const deleteAdminOrder = async (req, res, next) => {
  try {
    const order = await Delivery.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order record not found',
      });
    }

    await order.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Order/Delivery statistics for Admin Dashboard
 * @route   GET /api/v1/admin/orders/stats
 * @route   GET /api/v1/admin/deliveries/stats
 * @access  Private (Admin)
 */
const getAdminOrderStats = async (req, res, next) => {
  try {
    const totalOrders = await Delivery.countDocuments();
    const pendingOrders = await Delivery.countDocuments({ deliveryStatus: 'pending' });
    const outForDeliveryOrders = await Delivery.countDocuments({ deliveryStatus: 'out_for_delivery' });
    const deliveredOrders = await Delivery.countDocuments({ deliveryStatus: 'delivered' });
    const cancelledOrders = await Delivery.countDocuments({ deliveryStatus: 'cancelled' });

    const totalRevenueResult = await Delivery.aggregate([
      { $match: { deliveryStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$paymentDetails.totalAmount' } } },
    ]);

    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        outForDeliveryOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOrders,
  getAdminOrderById,
  takeAdminOrderAction,
  deleteAdminOrder,
  getAdminOrderStats,
};
