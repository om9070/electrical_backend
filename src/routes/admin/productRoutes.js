const express = require('express');
const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} = require('../../controllers/admin/productController');
const { protectAdmin } = require('../../middlewares/admin/adminAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const { uploadMultipleProductImages } = require('../../middlewares/common/uploadMiddleware');
const {
  createProductSchema,
  updateProductSchema,
  toggleProductStatusSchema,
  productQuerySchema,
} = require('../../validations/admin/productValidation');

router.use(protectAdmin);

// Create Product & Get Products List (with Search, Filter, Pagination)
router
  .route('/')
  .post(uploadMultipleProductImages, validate(createProductSchema), createProduct)
  .get(validate(productQuerySchema, 'query'), getProducts);

// Toggle Product Status (Must be registered before /:id)
router
  .route('/toggleStatus')
  .patch(validate(toggleProductStatusSchema), toggleProductStatus)
  .put(validate(toggleProductStatusSchema), toggleProductStatus);

// Single Product Operations by ID
router
  .route('/:id')
  .get(getProductById)
  .put(uploadMultipleProductImages, validate(updateProductSchema), updateProduct)
  .delete(deleteProduct);

module.exports = router;
