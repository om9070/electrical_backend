const Product = require('../../models/admin/Product');
const Category = require('../../models/admin/Category');
const { deleteS3Object } = require('../../config/s3');

/**
 * Helper function to extract ONLY newly uploaded image URLs from req.files or req.file
 */
const extractUploadedFilesUrls = (req) => {
  let urls = [];
  const getFileUrl = (f) => {
    if (!f) return null;
    if (f.location) return f.location;
    if (f.path) return f.path;
    if (f.filename) return `/uploads/${f.filename}`;
    if (f.buffer) return `data:${f.mimetype || 'image/png'};base64,${f.buffer.toString('base64')}`;
    return null;
  };

  if (req.files) {
    const filesArray = Array.isArray(req.files)
      ? req.files
      : (Array.isArray(req.files.images) ? req.files.images : (Array.isArray(req.files.image) ? req.files.image : []));

    filesArray.forEach(f => {
      const u = getFileUrl(f);
      if (u && typeof u === 'string') urls.push(u);
    });
  } else if (req.file) {
    const u = getFileUrl(req.file);
    if (u && typeof u === 'string') urls.push(u);
  }
  return urls;
};

/**
 * Helper function to extract uploaded image URLs from req.files, req.file, or req.body
 */
const extractProductImageUrls = (req) => {
  let imagesList = extractUploadedFilesUrls(req);

  if (imagesList.length === 0 && req.body) {
    const rawImages = req.body.images || req.body.image;
    if (Array.isArray(rawImages)) {
      rawImages.forEach(img => {
        if (typeof img === 'string' && img.trim()) {
          imagesList.push(img.trim());
        }
      });
    } else if (typeof rawImages === 'string' && rawImages.trim()) {
      try {
        const parsed = JSON.parse(rawImages);
        if (Array.isArray(parsed)) {
          parsed.forEach(img => {
            if (typeof img === 'string' && img.trim()) imagesList.push(img.trim());
          });
        } else {
          imagesList.push(rawImages.trim());
        }
      } catch (e) {
        imagesList.push(rawImages.trim());
      }
    }
  }

  return imagesList.filter(img => typeof img === 'string' && img.trim().length > 0);
};

/**
 * Helper function to parse variants input from body/multipart form-data
 */
const parseVariants = (input, defaultPrice, defaultUnit) => {
  let list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string' && input.trim()) {
    try {
      const parsed = JSON.parse(input.trim());
      if (Array.isArray(parsed)) list = parsed;
    } catch (e) {
      list = [];
    }
  }

  const sanitized = list
    .map((v) => {
      if (!v || typeof v !== 'object') return null;
      const unit = typeof v.unit === 'string' ? v.unit.trim() : '';
      const price = Number(v.price);
      if (!unit || isNaN(price) || price < 0) return null;
      return { unit, price };
    })
    .filter(Boolean);

  if (sanitized.length > 0) {
    return sanitized;
  }

  if (defaultPrice !== undefined && defaultPrice !== null && defaultPrice !== '' && !isNaN(Number(defaultPrice))) {
    const unitStr = defaultUnit && typeof defaultUnit === 'string' ? defaultUnit.trim() : 'piece';
    return [{ unit: unitStr || 'piece', price: Number(defaultPrice) }];
  }

  return [];
};

/**
 * @desc    Create Product (Role User)
 * @route   POST /api/v1/role/products
 * @access  Private (Role User)
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      brand,
      warranty,
      category,
      price,
      unit,
      variants,
      description,
      status,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    if (!sku || !sku.trim()) {
      return res.status(400).json({ success: false, message: 'SKU is required' });
    }

    const uppercaseSku = sku.trim().toUpperCase();
    const existingSku = await Product.findOne({ sku: uppercaseSku });
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: `Product with SKU '${uppercaseSku}' already exists`,
      });
    }

    const parsedVariants = parseVariants(variants, price, unit);
    if (parsedVariants.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid price and unit or variants are required' });
    }

    const firstVariant = parsedVariants[0];
    const defaultPrice = (price !== undefined && price !== null && price !== '' && !isNaN(Number(price)))
      ? Number(price)
      : firstVariant.price;
    const defaultUnit = (unit && typeof unit === 'string' && unit.trim()) ? unit.trim() : firstVariant.unit;

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const imagesList = extractProductImageUrls(req);
    if (imagesList.length === 0) {
      return res.status(400).json({ success: false, message: 'At least 1 product image is required' });
    }

    const product = await Product.create({
      name: name.trim(),
      sku: uppercaseSku,
      brand: brand ? brand.trim() : '',
      warranty: warranty ? warranty.trim() : '',
      category,
      price: defaultPrice,
      unit: defaultUnit,
      variants: parsedVariants,
      description: description ? description.trim() : '',
      images: imagesList,
      status: status !== undefined ? Number(status) : 1,
    });

    const populatedProduct = await Product.findById(product._id).populate('category', 'name status');

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all products for Role users (with search, category, brand, status, and pagination)
 * @route   GET /api/v1/role/products?page=1&limit=10&category=&brand=&search=&status=
 * @access  Private (Role User)
 */
const getProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const { category, brand, search, status } = req.query;
    let query = {};

    if (status !== undefined && status !== '') {
      query.status = Number(status);
    }

    if (category) {
      query.category = category;
    }

    if (brand && brand.trim()) {
      query.brand = { $regex: brand.trim(), $options: 'i' };
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { brand: searchRegex },
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name description image status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get category-wise active/all products for Role users (with pagination)
 * @route   GET /api/v1/role/products/category-wise?page=1&limit=10&search=&category=&productLimit=
 * @access  Private (Role User)
 */
const getProductsByCategoryWise = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const { search, category, productLimit } = req.query;

    let categoryFilter = {};
    if (category) {
      categoryFilter._id = category;
    }

    // Fetch categories
    let categories = await Category.find(categoryFilter).sort({ name: 1 });

    let productFilter = {};
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      productFilter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { brand: searchRegex },
      ];
    }

    let categoryDataList = [];
    let grandTotalProducts = 0;

    for (const cat of categories) {
      const catProductQuery = {
        ...productFilter,
        category: cat._id,
      };

      const count = await Product.countDocuments(catProductQuery);

      if (search && search.trim()) {
        const catNameMatch = cat.name.match(new RegExp(search.trim(), 'i'));
        if (!catNameMatch && count === 0) {
          continue;
        }
      }

      let prodQuery = Product.find(catProductQuery).sort({ createdAt: -1 });

      if (productLimit && parseInt(productLimit, 10) > 0) {
        prodQuery = prodQuery.limit(parseInt(productLimit, 10));
      }

      const products = await prodQuery;
      grandTotalProducts += count;

      categoryDataList.push({
        category: {
          _id: cat._id,
          name: cat.name,
          description: cat.description,
          image: cat.image,
          status: cat.status,
        },
        totalProducts: count,
        products,
      });
    }

    const totalCategories = categoryDataList.length;
    const paginatedCategories = categoryDataList.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalCategories / limit) || 1;

    return res.status(200).json({
      success: true,
      pagination: {
        totalCategories,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      totalProducts: grandTotalProducts,
      data: paginatedCategories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID (Role User)
 * @route   GET /api/v1/role/products/:id
 * @access  Private (Role User)
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'category',
      'name description image status'
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Product (Role User)
 * @route   PUT /api/v1/role/products/:id
 * @access  Private (Role User)
 */
const updateProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      brand,
      warranty,
      category,
      price,
      unit,
      variants,
      description,
      specs,
      images,
      existingImages,
      removedImages,
      status,
    } = req.body;

    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const oldImages = Array.isArray(product.images) ? [...product.images] : [];

    if (sku && sku.trim().toUpperCase() !== product.sku) {
      const uppercaseSku = sku.trim().toUpperCase();
      const existingSku = await Product.findOne({ sku: uppercaseSku });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: `Product with SKU '${uppercaseSku}' already exists`,
        });
      }
      product.sku = uppercaseSku;
    }

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      product.category = category;
    }

    if (name !== undefined) product.name = name.trim();
    if (brand !== undefined) product.brand = brand.trim();
    if (warranty !== undefined) product.warranty = warranty.trim();

    if (variants !== undefined || price !== undefined || unit !== undefined) {
      const existingPrice = price !== undefined ? price : product.price;
      const existingUnit = unit !== undefined ? unit : product.unit;
      const updatedVariants = parseVariants(
        variants !== undefined ? variants : product.variants,
        existingPrice,
        existingUnit
      );
      if (updatedVariants.length > 0) {
        product.variants = updatedVariants;
        product.markModified('variants');
        if (price !== undefined) product.price = Number(price);
        else if (updatedVariants.length > 0) product.price = updatedVariants[0].price;

        if (unit !== undefined) product.unit = unit.trim();
        else if (updatedVariants.length > 0) product.unit = updatedVariants[0].unit;
      }
    }

    if (description !== undefined) product.description = description.trim();
    if (status !== undefined) product.status = Number(status);

    const cleanUrlStr = (str) => {
      if (!str || typeof str !== 'string') return '';
      let s = str.trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
      }
      return s;
    };

    const parseImageUrlsInput = (input) => {
      if (!input) return [];
      let list = [];
      if (Array.isArray(input)) {
        list = input;
      } else if (typeof input === 'string' && input.trim()) {
        const trimmed = input.trim();
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) list = parsed;
          else list = [trimmed];
        } catch (e) {
          list = [trimmed];
        }
      }
      return list.map(cleanUrlStr).filter(Boolean);
    };

    const explicitRemoved = parseImageUrlsInput(removedImages);
    const imagesInput = existingImages !== undefined ? existingImages : images;
    let keptImages = null;

    if (imagesInput !== undefined) {
      keptImages = parseImageUrlsInput(imagesInput);
    }

    const newlyUploaded = extractUploadedFilesUrls(req).map(cleanUrlStr).filter(Boolean);

    if (keptImages !== null || newlyUploaded.length > 0 || explicitRemoved.length > 0) {
      const baseKept = keptImages !== null ? keptImages : oldImages.map(cleanUrlStr);
      const updatedKeptImages = baseKept.filter(img => !explicitRemoved.includes(img));
      const finalImages = [...new Set([...updatedKeptImages, ...newlyUploaded])];

      if (finalImages.length === 0) {
        return res.status(400).json({ success: false, message: 'At least 1 product image is required' });
      }

      const imagesToDelete = [
        ...explicitRemoved,
        ...oldImages.map(cleanUrlStr).filter(oldImg => oldImg && !finalImages.includes(oldImg))
      ];
      const uniqueImagesToDelete = [...new Set(imagesToDelete.filter(Boolean))];

      for (const imgUrl of uniqueImagesToDelete) {
        await deleteS3Object(imgUrl);
      }

      product.images = finalImages;
      product.markModified('images');
    }

    if (!product.images || product.images.length === 0) {
      return res.status(400).json({ success: false, message: 'At least 1 product image is required' });
    }

    await product.save();

    const updatedProduct = await Product.findById(product._id).populate('category', 'name status');

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Product status (Role User)
 * @route   PATCH /api/v1/role/products/toggleStatus or PUT /api/v1/role/products/toggleStatus
 * @access  Private (Role User)
 */
const toggleProductStatus = async (req, res, next) => {
  try {
    const productId = req.body._id || req.params.id;
    const { status } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.status = Number(status);
    await product.save();

    const updatedProduct = await Product.findById(product._id).populate('category', 'name status');

    return res.status(200).json({
      success: true,
      message: 'Product status toggled successfully',
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Product (Role User)
 * @route   DELETE /api/v1/role/products/:id
 * @access  Private (Role User)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (Array.isArray(product.images)) {
      for (const imgUrl of product.images) {
        await deleteS3Object(imgUrl);
      }
    }

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getActiveProducts: getProducts, // Backward compatibility alias
  getProductsByCategoryWise,
  getProductById,
  getActiveProductById: getProductById, // Backward compatibility alias
  updateProduct,
  toggleProductStatus,
  deleteProduct,
};
