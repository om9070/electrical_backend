const Delivery = require('../../models/role/Delivery');
const Cart = require('../../models/role/Cart');
const Product = require('../../models/admin/Product');

/**
 * Generate unique delivery/order number
 */
const generateDeliveryNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomDigits}`;
};

/**
 * @desc    Create manual delivery / place order (from active Cart or custom items)
 * @route   POST /api/v1/role/deliveries
 * @route   POST /api/v1/role/orders
 * @route   POST /api/v1/role/orders/place
 * @access  Private (Role User)
 */
const createManualDelivery = async (req, res, next) => {
  try {
    const {
      customer,
      fromCart,
      items: customItems,
      deliveryType = 'manual',
      deliveryPerson,
      paymentDetails,
      manualNotes,
    } = req.body || {};

    let deliveryItems = [];
    let calculatedTotal = 0;

    // Use cart if explicitly requested OR if custom items are not provided
    const isCartOrder = fromCart || (!customItems || !Array.isArray(customItems) || customItems.length === 0);

    if (isCartOrder) {
      const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty. Add products to cart first or provide order items.',
        });
      }

      for (const cartItem of cart.items) {
        const itemUnitPrice = cartItem.unitPrice || (cartItem.product ? cartItem.product.price : 0);
        const itemUnit = cartItem.unit || (cartItem.product ? cartItem.product.unit : 'piece');
        const itemTotal = cartItem.quantity * itemUnitPrice;
        calculatedTotal += itemTotal;

        deliveryItems.push({
          product: cartItem.product ? cartItem.product._id : null,
          name: cartItem.product ? cartItem.product.name : 'Unknown Product',
          sku: cartItem.product ? cartItem.product.sku : '',
          unit: itemUnit,
          quantity: cartItem.quantity,
          unitPrice: itemUnitPrice,
          totalPrice: itemTotal,
        });
      }

      // Clear the user's cart after successfully placing order
      cart.items = [];
      cart.cartTotal = 0;
      cart.totalItems = 0;
      await cart.save();
    } else {
      for (const item of customItems) {
        let prodName = item.name || '';
        let prodSku = item.sku || '';
        let prodUnit = item.unit || 'piece';
        let itemUnitPrice = item.unitPrice;

        if (item.productId) {
          const dbProd = await Product.findById(item.productId);
          if (dbProd) {
            if (!prodName) prodName = dbProd.name;
            if (!prodSku) prodSku = dbProd.sku;
            if (!prodUnit) prodUnit = item.unit || dbProd.unit || 'piece';
            if (itemUnitPrice === undefined || itemUnitPrice === null) {
              if (Array.isArray(dbProd.variants) && dbProd.variants.length > 0) {
                const matchedVar = dbProd.variants.find(
                  (v) => v.unit && v.unit.trim().toLowerCase() === prodUnit.trim().toLowerCase()
                );
                if (matchedVar) itemUnitPrice = Number(matchedVar.price);
              }
              if (itemUnitPrice === undefined || itemUnitPrice === null) {
                itemUnitPrice = dbProd.price;
              }
            }
          }
        }

        if (itemUnitPrice === undefined || itemUnitPrice === null) {
          itemUnitPrice = 0;
        }

        const itemTotal = item.quantity * itemUnitPrice;
        calculatedTotal += itemTotal;

        deliveryItems.push({
          product: item.productId || null,
          name: prodName || 'Product Item',
          sku: prodSku,
          unit: prodUnit,
          quantity: item.quantity,
          unitPrice: itemUnitPrice,
          totalPrice: itemTotal,
        });
      }
    }

    const finalTotalAmount =
      paymentDetails && paymentDetails.totalAmount !== undefined
        ? paymentDetails.totalAmount
        : calculatedTotal;

    const customerData = {
      customerName: (customer && customer.customerName) || req.user.personName || req.user.roleTitle || req.user.roleName || 'Customer',
      mobile: (customer && customer.mobile) || req.user.mobile || '0000000000',
      email: (customer && customer.email) || req.user.email || '',
      fullAddress: (customer && customer.fullAddress) || req.user.address || 'Latehar',
      landmark: (customer && customer.landmark) || '',
      city: (customer && customer.city) || 'Latehar',
      pinCode: (customer && customer.pinCode) || '',
    };

    const deliveryNumber = generateDeliveryNumber();

    const delivery = new Delivery({
      deliveryNumber,
      roleUser: req.user._id,
      customer: customerData,
      items: deliveryItems,
      deliveryType,
      deliveryPerson: deliveryPerson || {},
      paymentDetails: {
        method: (paymentDetails && paymentDetails.method) || 'cash',
        status: (paymentDetails && paymentDetails.status) || 'pending',
        amountPaid: (paymentDetails && paymentDetails.amountPaid) || 0,
        totalAmount: finalTotalAmount,
      },
      deliveryStatus: 'pending',
      manualNotes: manualNotes || '',
    });

    await delivery.save();

    await delivery.populate([
      { path: 'roleUser', select: 'roleName roleTitle email mobile' },
      { path: 'items.product', select: 'name sku brand images price unit' },
    ]);

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get role orders / deliveries (with pagination and filters)
 * @route   GET /api/v1/role/deliveries?page=1&limit=10&status=&search=
 * @route   GET /api/v1/role/orders?page=1&limit=10&status=&search=
 * @access  Private (Role User)
 */
const getDeliveries = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    let query = {};

    if (status) {
      query.deliveryStatus = status;
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

    const total = await Delivery.countDocuments(query);
    const deliveries = await Delivery.find(query)
      .populate('roleUser', 'roleName roleTitle email mobile')
      .populate('items.product', 'name sku brand images price unit')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: deliveries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order details by ID
 * @route   GET /api/v1/role/deliveries/:id
 * @route   GET /api/v1/role/orders/:id
 * @access  Private (Role User)
 */
const getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('roleUser', 'roleName roleTitle email mobile')
      .populate('items.product', 'name sku brand images price unit');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Order record not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update delivery/order status and payment details
 * @route   PUT /api/v1/role/deliveries/:id/status
 * @route   PUT /api/v1/role/orders/:id/status
 * @access  Private (Role User)
 */
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { deliveryStatus, paymentStatus, amountPaid, deliveryPerson, manualNotes } = req.body;

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Order record not found',
      });
    }

    if (deliveryStatus) {
      delivery.deliveryStatus = deliveryStatus;
      if ((deliveryStatus === 'out_for_delivery' || deliveryStatus === 'assigned') && !delivery.dispatchDate) {
        delivery.dispatchDate = new Date();
      }
      if (deliveryStatus === 'delivered') {
        delivery.deliveryDate = new Date();
        if (!delivery.dispatchDate) {
          delivery.dispatchDate = new Date();
        }
      }
    }

    if (paymentStatus) {
      delivery.paymentDetails.status = paymentStatus;
    }

    if (amountPaid !== undefined) {
      delivery.paymentDetails.amountPaid = amountPaid;
      if (amountPaid >= delivery.paymentDetails.totalAmount) {
        delivery.paymentDetails.status = 'paid';
      } else if (amountPaid > 0) {
        delivery.paymentDetails.status = 'partially_paid';
      }
    }

    if (deliveryPerson) {
      delivery.deliveryPerson = {
        ...delivery.deliveryPerson,
        ...deliveryPerson,
      };
    }

    if (manualNotes !== undefined) {
      delivery.manualNotes = manualNotes;
    }

    await delivery.save();

    await delivery.populate([
      { path: 'roleUser', select: 'roleName roleTitle email mobile' },
      { path: 'items.product', select: 'name sku brand images' },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order
 * @route   PUT /api/v1/role/deliveries/:id/cancel
 * @route   PUT /api/v1/role/orders/:id/cancel
 * @access  Private (Role User)
 */
const cancelDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Order record not found',
      });
    }

    if (delivery.deliveryStatus === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an already delivered order',
      });
    }

    delivery.deliveryStatus = 'cancelled';
    await delivery.save();

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createManualDelivery,
  placeOrder: createManualDelivery, // Alias
  getDeliveries,
  getOrders: getDeliveries, // Alias
  getDeliveryById,
  getOrderById: getDeliveryById, // Alias
  updateDeliveryStatus,
  updateOrderStatus: updateDeliveryStatus, // Alias
  cancelDelivery,
  cancelOrder: cancelDelivery, // Alias
};
