const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkoutCart,
} = require('../../controllers/role/cartController');
const { protectRole } = require('../../middlewares/role/roleAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const {
  addToCartSchema,
  updateCartItemSchema,
  removeItemSchema,
} = require('../../validations/role/cartValidation');

// All cart routes require role authentication
router.use(protectRole);

// 1. READ CART
router.get('/', getCart);

// 2. CREATE / ADD ITEM TO CART
router.post('/', validate(addToCartSchema, 'body'), addToCart);
router.post('/add', validate(addToCartSchema, 'body'), addToCart);
router.post('/items', validate(addToCartSchema, 'body'), addToCart);

// 3. CHECKOUT CART -> PLACE ORDER
router.post('/checkout', checkoutCart);
router.post('/place-order', checkoutCart);

// 4. UPDATE ITEM IN CART
router.put('/', validate(updateCartItemSchema, 'body'), updateCartItem);
router.put('/item', validate(updateCartItemSchema, 'body'), updateCartItem);
router.put('/update', validate(updateCartItemSchema, 'body'), updateCartItem);
router.put('/:productId', validate(updateCartItemSchema, 'body'), updateCartItem);
router.patch('/:productId', validate(updateCartItemSchema, 'body'), updateCartItem);

// 5. DELETE ITEM FROM CART
router.delete('/item/:productId', validate(removeItemSchema, 'params'), removeFromCart);
router.delete('/remove/:productId', validate(removeItemSchema, 'params'), removeFromCart);
router.delete('/:productId', validate(removeItemSchema, 'params'), removeFromCart);

// 6. DELETE / CLEAR WHOLE CART
router.delete('/', clearCart);
router.delete('/clear', clearCart);

module.exports = router;
