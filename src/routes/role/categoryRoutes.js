const express = require('express');
const router = express.Router();

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
} = require('../../controllers/role/categoryController');
const { protectRole } = require('../../middlewares/role/roleAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const { uploadSingleProductImage } = require('../../middlewares/common/uploadMiddleware');
const {
  createCategorySchema,
  updateCategorySchema,
  toggleCategoryStatusSchema,
  categoryQuerySchema,
} = require('../../validations/role/categoryValidation');

// Protect all role category routes
router.use(protectRole);

// Create Category & Get Categories List (with pagination, search, status filter)
router
  .route('/')
  .post(uploadSingleProductImage, validate(createCategorySchema), createCategory)
  .get(validate(categoryQuerySchema, 'query'), getCategories);

// Toggle Category status (Must be registered before /:id)
router
  .route('/toggleStatus')
  .patch(validate(toggleCategoryStatusSchema), toggleCategoryStatus)
  .put(validate(toggleCategoryStatusSchema), toggleCategoryStatus);

// Single Category Operations by ID
router
  .route('/:id')
  .get(getCategoryById)
  .put(uploadSingleProductImage, validate(updateCategorySchema), updateCategory)
  .delete(deleteCategory);

module.exports = router;
