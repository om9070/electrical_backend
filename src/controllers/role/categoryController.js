const Category = require('../../models/admin/Category');
const { deleteS3Object } = require('../../config/s3');

/**
 * @desc    Create Category (Role User)
 * @route   POST /api/v1/role/categories
 * @access  Private (Role User)
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `Category '${name}' already exists`,
      });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = req.file.location || req.file.path || req.file.filename || '';
    } else if (req.body && req.body.image) {
      imageUrl = req.body.image;
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Category photo is required',
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      image: imageUrl,
      status: status !== undefined ? Number(status) : 1,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Categories for Role users (with pagination, status filter, and search)
 * @route   GET /api/v1/role/categories?page=1&limit=10&search=&status=
 * @access  Private (Role User)
 */
const getCategories = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status !== undefined && req.query.status !== '') {
      filter.status = Number(req.query.status);
    }
    if (req.query.search && req.query.search.trim()) {
      filter.name = { $regex: req.query.search.trim(), $options: 'i' };
    }

    const total = await Category.countDocuments(filter);
    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      count: categories.length,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single Category by ID (Role User)
 * @route   GET /api/v1/role/categories/:id
 * @access  Private (Role User)
 */
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Category (Role User)
 * @route   PUT /api/v1/role/categories/:id
 * @access  Private (Role User)
 */
const updateCategory = async (req, res, next) => {
  try {
    const { name, description, image, status } = req.body;

    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    if (name && name.trim() !== category.name) {
      const existing = await Category.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Category name '${name}' already exists`,
        });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description;

    const oldImage = category.image;
    let newImage = null;

    if (req.file && (req.file.location || req.file.path || req.file.filename)) {
      newImage = req.file.location || req.file.path || req.file.filename;
    } else if (image !== undefined) {
      newImage = image;
    }

    if (newImage && newImage !== oldImage) {
      if (oldImage) {
        await deleteS3Object(oldImage);
      }
      category.image = newImage;
    }

    if (!category.image) {
      return res.status(400).json({
        success: false,
        message: 'Category photo is required',
      });
    }

    if (status !== undefined) category.status = Number(status);

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Category status (Role User)
 * @route   PATCH /api/v1/role/categories/toggleStatus or PUT /api/v1/role/categories/toggleStatus
 * @access  Private (Role User)
 */
const toggleCategoryStatus = async (req, res, next) => {
  try {
    const categoryId = req.body._id || req.params.id;
    const { status } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    category.status = Number(status);
    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category status toggled successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Category (Role User)
 * @route   DELETE /api/v1/role/categories/:id
 * @access  Private (Role User)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    if (category.image) {
      await deleteS3Object(category.image);
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getActiveCategories: getCategories, // Backward compatibility alias
  getCategoryById,
  getActiveCategoryById: getCategoryById, // Backward compatibility alias
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
};
