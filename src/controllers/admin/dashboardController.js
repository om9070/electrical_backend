const Category = require('../../models/admin/Category');
const Product = require('../../models/admin/Product');
const Role = require('../../models/role/Role');

/**
 * @desc    Get Admin Dashboard counts for Category, Role, and Product
 * @route   GET /api/v1/admin/dashboard/counts
 * @access  Private (Admin)
 */
const getCounts = async (req, res, next) => {
  try {
    const [
      totalCategories,
      totalRoles,
      totalProducts
    ] = await Promise.all([
      Category.countDocuments({ status: 1 }),
      Role.countDocuments({ status: 1 }),
      Product.countDocuments({ status: 1 }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalCategories,
        totalRoles,
        totalProducts
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCounts,
};
