const Product = require('../../models/admin/Product');
const Category = require('../../models/admin/Category');
const { deleteS3Object } = require('../../config/s3');
const mongoose = require('mongoose');

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
 * @desc    Create Product
 * @route   POST /api/v1/admin/products
 * @access  Private (Admin)
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
 * @desc    Get all Products (Admin view with search, filter, and pagination)
 * @route   GET /api/v1/admin/products
 * @access  Private (Admin)
 */
const getProducts = async (req, res, next) => {
  try {
    const { search, category, brand, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const filter = {};

    if (category && category.trim()) {
      filter.category = category.trim();
    }

    if (brand && brand.trim()) {
      filter.brand = { $regex: brand.trim(), $options: 'i' };
    }

    if (status !== undefined && status !== '') {
      filter.status = Number(status);
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { brand: searchRegex },
      ];
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name status')
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
      },
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single Product by ID
 * @route   GET /api/v1/admin/products/:id
 * @access  Private (Admin)
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const product = await Product.findById(id).populate('category', 'name status');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
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
 * @desc    Update Product
 * @route   PUT /api/v1/admin/products/:id
 * @access  Private (Admin)
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

    // Helper to sanitize URL strings
    const cleanUrlStr = (str) => {
      if (!str || typeof str !== 'string') return '';
      let s = str.trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
      }
      return s;
    };

    // Helper to parse image URL input array or JSON string
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

    // 1. Parse explicitly removed images
    const explicitRemoved = parseImageUrlsInput(removedImages);

    // 2. Parse existing/kept images
    const imagesInput = existingImages !== undefined ? existingImages : images;
    let keptImages = null;

    if (imagesInput !== undefined) {
      keptImages = parseImageUrlsInput(imagesInput);
    }

    // 3. Extract newly uploaded S3 image files
    const newlyUploaded = extractUploadedFilesUrls(req).map(cleanUrlStr).filter(Boolean);

    // If client updated images or uploaded files or removed images
    if (keptImages !== null || newlyUploaded.length > 0 || explicitRemoved.length > 0) {
      const baseKept = keptImages !== null ? keptImages : oldImages.map(cleanUrlStr);
      const updatedKeptImages = baseKept.filter(img => !explicitRemoved.includes(img));
      const finalImages = [...new Set([...updatedKeptImages, ...newlyUploaded])];

      if (finalImages.length === 0) {
        return res.status(400).json({ success: false, message: 'At least 1 product image is required' });
      }

      // Determine images to delete from S3 (explicitly removed + old images omitted from final list)
      const imagesToDelete = [
        ...explicitRemoved,
        ...oldImages.map(cleanUrlStr).filter(oldImg => oldImg && !finalImages.includes(oldImg))
      ];
      const uniqueImagesToDelete = [...new Set(imagesToDelete.filter(Boolean))];

      console.log('[Product Update] Images to delete from S3:', uniqueImagesToDelete);
      console.log('[Product Update] Final images to save in DB:', finalImages);

      // Delete removed images from S3
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
 * @desc    Delete Product
 * @route   DELETE /api/v1/admin/products/:id
 * @access  Private (Admin)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete associated product images from S3
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

/**
 * @desc    Toggle Active/Inactive Product status
 * @route   PATCH /api/v1/admin/products/toggleStatus or /api/v1/admin/products/:id/status
 * @access  Private (Admin)
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

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
};
