const Cart = require('../../models/role/Cart');
const Product = require('../../models/admin/Product');
const { createManualDelivery } = require('./deliveryController');

/**
 * Helper to get or create cart for logged in role user
 */
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({
      user: userId,
      items: [],
      cartTotal: 0,
      totalItems: 0,
    });
    await cart.save();
  }
  return cart;
};

/**
 * Helper to determine unit price for a given product and requested unit
 */
const getUnitPriceForProduct = (product, requestedUnit) => {
  if (!product) return { price: 0, unit: 'piece' };
  const targetUnit = requestedUnit ? requestedUnit.trim().toLowerCase() : '';

  if (targetUnit && Array.isArray(product.variants) && product.variants.length > 0) {
    const matched = product.variants.find(
      (v) => v.unit && v.unit.trim().toLowerCase() === targetUnit
    );
    if (matched && matched.price !== undefined && matched.price !== null) {
      return { price: Number(matched.price), unit: matched.unit };
    }
  }

  if (product.price !== undefined && product.price !== null) {
    return {
      price: Number(product.price),
      unit: (requestedUnit && requestedUnit.trim()) || product.unit || 'piece',
    };
  }

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return {
      price: Number(product.variants[0].price),
      unit: product.variants[0].unit,
    };
  }

  return { price: 0, unit: requestedUnit || 'piece' };
};

/**
 * Helper to format cart object so every item includes price and variant object for client compatibility
 */
const formatCartResponse = (cart) => {
  if (!cart) return cart;
  const cartObj = cart.toObject ? cart.toObject() : cart;
  if (Array.isArray(cartObj.items)) {
    cartObj.items = cartObj.items.map((item) => ({
      ...item,
      price: item.unitPrice,
      variant: {
        unit: item.unit || 'piece',
        price: item.unitPrice,
      },
    }));
  }
  return cartObj;
};

/**
 * @desc    Get logged in Role user's cart (READ)
 * @route   GET /api/v1/role/cart
 * @access  Private (Role User)
 */
const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);

    // Refresh prices and filter out inactive products if any
    let updated = false;
    const activeItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (product && product.status === 1) {
        const { price: currentPrice } = getUnitPriceForProduct(product, item.unit);
        if (item.unitPrice !== currentPrice) {
          item.unitPrice = currentPrice;
          updated = true;
        }
        activeItems.push(item);
      } else {
        updated = true; // drop deleted or inactive product
      }
    }

    if (updated || activeItems.length !== cart.items.length) {
      cart.items = activeItems;
      cart.calculateTotals();
      await cart.save();
    }

    await cart.populate({
      path: 'items.product',
      select: 'name sku price unit variants images status brand specs category',
      populate: { path: 'category', select: 'name' },
    });

    return res.status(200).json({
      success: true,
      data: formatCartResponse(cart),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to cart or increment quantity (CREATE)
 * @route   POST /api/v1/role/cart
 * @access  Private (Role User)
 */
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, unit } = req.body;

    const product = await Product.findOne({ _id: productId, status: 1 });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Active product not found',
      });
    }

    const { price: itemUnitPrice, unit: selectedUnit } = getUnitPriceForProduct(product, unit);
    const cart = await getOrCreateCart(req.user._id);

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId.toString() &&
        (item.unit || 'piece').trim().toLowerCase() === selectedUnit.trim().toLowerCase()
    );

    if (itemIndex > -1) {
      // Product & unit exists in cart, update quantity
      cart.items[itemIndex].quantity += parseInt(quantity, 10);
      cart.items[itemIndex].unitPrice = itemUnitPrice;
      cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * itemUnitPrice;
    } else {
      // Product & unit does not exist in cart, add new item
      cart.items.push({
        product: productId,
        unit: selectedUnit,
        quantity: parseInt(quantity, 10),
        unitPrice: itemUnitPrice,
        totalPrice: parseInt(quantity, 10) * itemUnitPrice,
      });
    }

    cart.calculateTotals();
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name sku price unit variants images status brand specs category',
      populate: { path: 'category', select: 'name' },
    });

    return res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update quantity of specific item in cart (UPDATE)
 * @route   PUT /api/v1/role/cart/item OR PUT /api/v1/role/cart/:productId
 * @access  Private (Role User)
 */
const updateCartItem = async (req, res, next) => {
  try {
    const productId = req.params.productId || req.body.productId;
    const { quantity, unit } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const product = await Product.findOne({ _id: productId, status: 1 });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Active product not found',
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const itemIndex = cart.items.findIndex((item) => {
      if (item.product.toString() !== productId.toString()) return false;
      if (unit && unit.trim()) {
        return (item.unit || 'piece').trim().toLowerCase() === unit.trim().toLowerCase();
      }
      return true;
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });
    }

    const currentUnit = unit || cart.items[itemIndex].unit;
    const { price: itemUnitPrice, unit: selectedUnit } = getUnitPriceForProduct(product, currentUnit);

    cart.items[itemIndex].quantity = parseInt(quantity, 10);
    cart.items[itemIndex].unit = selectedUnit;
    cart.items[itemIndex].unitPrice = itemUnitPrice;
    cart.items[itemIndex].totalPrice = parseInt(quantity, 10) * itemUnitPrice;

    cart.calculateTotals();
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name sku price unit variants images status brand specs category',
      populate: { path: 'category', select: 'name' },
    });

    return res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove single item from cart (DELETE ITEM)
 * @route   DELETE /api/v1/role/cart/:productId OR DELETE /api/v1/role/cart/item/:productId
 * @access  Private (Role User)
 */
const removeFromCart = async (req, res, next) => {
  try {
    const productId = req.params.productId || req.body.productId;
    const unit = req.query.unit || (req.body && req.body.unit);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => {
      if (item.product.toString() !== productId.toString()) return true;
      if (unit && unit.trim()) {
        return (item.unit || 'piece').trim().toLowerCase() !== unit.trim().toLowerCase();
      }
      return false;
    });

    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });
    }

    cart.calculateTotals();
    await cart.save();

    await cart.populate({
      path: 'items.product',
      select: 'name sku price unit variants images status brand specs category',
      populate: { path: 'category', select: 'name' },
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear all items from cart (DELETE CART)
 * @route   DELETE /api/v1/role/cart
 * @access  Private (Role User)
 */
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      cart.cartTotal = 0;
      cart.totalItems = 0;
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: formatCartResponse(cart) || { user: req.user._id, items: [], cartTotal: 0, totalItems: 0 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Checkout cart and convert items into an Order
 * @route   POST /api/v1/role/cart/checkout
 * @route   POST /api/v1/role/cart/place-order
 * @access  Private (Role User)
 */
const checkoutCart = async (req, res, next) => {
  req.body = { ...req.body, fromCart: true };
  return createManualDelivery(req, res, next);
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkoutCart,
};
