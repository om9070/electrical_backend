const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

const { s3Client, isS3Configured, getStorageConfig } = require('../../config/s3');


// ==============================
// File Filter
// ==============================

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPG, JPEG, PNG and WEBP images are allowed.'
      )
    );
  }
};


// ==============================
// S3 / R2 Storage Creation
// ==============================

const createStorage = (folder) => {
  const config = getStorageConfig();
  return multerS3({
    s3: s3Client,
    bucket: config.bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname).toLowerCase();
      const key = `${folder}/${uniqueSuffix}${extension}`;
      cb(null, key);
    },
  });
};


// ==============================
// Normalize File URLs (Public R2 URL)
// ==============================

const normalizeFileLocations = (req) => {
  const { publicUrl } = getStorageConfig();
  if (!publicUrl) return;

  const cleanPublicUrl = publicUrl.replace(/\/+$/, '');

  const updateLocation = (file) => {
    if (file && file.key) {
      file.location = `${cleanPublicUrl}/${file.key}`;
    }
  };

  if (req.file) {
    updateLocation(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(updateLocation);
    } else if (typeof req.files === 'object') {
      Object.keys(req.files).forEach((key) => {
        if (Array.isArray(req.files[key])) {
          req.files[key].forEach(updateLocation);
        }
      });
    }
  }
};


// ==============================
// Product Upload Instance
// ==============================

const productStorage = isS3Configured()
  ? createStorage('product')
  : multer.memoryStorage();

const uploadProduct = multer({
  storage: productStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
});


// ==============================
// Single Image Upload Middleware
// field: image
// ==============================

const uploadSingleProductImage = (req, res, next) => {
  if (!isS3Configured()) {
    return res.status(500).json({
      success: false,
      message: 'Cloudflare R2 / S3 storage is not configured.',
    });
  }

  uploadProduct.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image size cannot exceed 2 MB.',
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    normalizeFileLocations(req);
    next();
  });
};


// ==============================
// Multiple Images Upload Middleware
// field: images
// maximum 5
// ==============================

const uploadMultipleProductImages = (req, res, next) => {
  if (!isS3Configured()) {
    return res.status(500).json({
      success: false,
      message: 'Cloudflare R2 / S3 storage is not configured.',
    });
  }

  uploadProduct.array('images', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Each image cannot exceed 2 MB.',
        });
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 images are allowed.',
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    normalizeFileLocations(req);
    next();
  });
};


module.exports = {
  uploadSingleProductImage,
  uploadMultipleProductImages,
};