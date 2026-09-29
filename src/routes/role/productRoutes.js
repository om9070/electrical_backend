const express = require('express');
const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductsByCategoryWise,
  getProductById,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} = require('../../controllers/role/productController');
const { protectRole } = require('../../middlewares/role/roleAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const { uploadMultipleProductImages } = require('../../middlewares/common/uploadMiddleware');
const {
  createProductSchema,
  updateProductSchema,
  toggleProductStatusSchema,
  productQuerySchema,
  categoryWiseProductQuerySchema,
} = require('../../validations/role/productValidation');

// Protect all role product routes
router.use(protectRole);

// GET products grouped category-wise (Must be registered before /:id)
router.get(
  '/category-wise',
  validate(categoryWiseProductQuerySchema, 'query'),
  getProductsByCategoryWise
);

// Toggle Product Status (Must be registered before /:id)
router
  .route('/toggleStatus')
  .patch(validate(toggleProductStatusSchema), toggleProductStatus)
  .put(validate(toggleProductStatusSchema), toggleProductStatus);

// Create Product & Get Products List (with Search, Filter, Pagination)
router
  .route('/')
  .post(uploadMultipleProductImages, validate(createProductSchema), createProduct)
  .get(validate(productQuerySchema, 'query'), getProducts);

// Single Product Operations by ID
router
  .route('/:id')
  .get(getProductById)
  .put(uploadMultipleProductImages, validate(updateProductSchema), updateProduct)
  .delete(deleteProduct);

module.exports = router;
