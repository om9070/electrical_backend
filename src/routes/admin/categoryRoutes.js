const express = require('express');
const router = express.Router();

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} = require('../../controllers/admin/categoryController');
const { protectAdmin } = require('../../middlewares/admin/adminAuthMiddleware');
const validate = require('../../middlewares/common/validateMiddleware');
const { uploadSingleProductImage } = require('../../middlewares/common/uploadMiddleware');
const {
  createCategorySchema,
  updateCategorySchema,
  toggleCategoryStatusSchema,
  categoryQuerySchema,
} = require('../../validations/admin/categoryValidation');

router.use(protectAdmin);

// Create category with single image upload (Max 2MB limit) & Get categories with pagination (page, limit, status, search)
router
  .route('/')
  .post(uploadSingleProductImage, validate(createCategorySchema), createCategory)
  .get(validate(categoryQuerySchema, 'query'), getCategories);

// Toggle category status (must be before /:id)
router
  .route('/toggleStatus')
  .patch(validate(toggleCategoryStatusSchema), toggleCategoryStatus)


// Update category with single image upload (Max 2MB limit)
router
  .route('/:id')
  .get(getCategoryById)
  .put(uploadSingleProductImage, validate(updateCategorySchema), updateCategory)
  .delete(deleteCategory);



module.exports = router;
