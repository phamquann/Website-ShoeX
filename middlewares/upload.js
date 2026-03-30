const multer = require('multer');
const path = require('path');
const config = require('../configs');
const response = require('./response');

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}${ext}`;
    cb(null, uniqueName);
  }
});

// Image file filter
const imageFilter = (req, file, cb) => {
  if (config.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Only images are allowed (${config.ALLOWED_IMAGE_TYPES.join(', ')})`));
  }
};

// Excel file filter
const excelFilter = (req, file, cb) => {
  if (file.mimetype.includes('spreadsheetml') || file.mimetype.includes('ms-excel')) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
  }
};

// Single image upload
const uploadSingleImage = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: imageFilter
});

// Multiple images upload (max 10)
const uploadMultipleImages = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: imageFilter
});

// Excel upload
const uploadExcel = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: excelFilter
});

/**
 * Multer error handler middleware
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return response.badRequest(res, `File too large. Maximum size is ${config.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    return response.badRequest(res, `Upload error: ${err.message}`);
  }
  if (err) {
    return response.badRequest(res, err.message);
  }
  next();
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  uploadExcel,
  handleUploadError
};
