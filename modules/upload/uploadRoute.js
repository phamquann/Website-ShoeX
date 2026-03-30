const express = require('express');
const router = express.Router();
const uploadController = require('./uploadController');
const uploadMiddleware = require('../../middlewares/upload');
const { authenticate } = require('../../middlewares/auth');

/**
 * Upload Routes - /api/v1/uploads
 * All routes require authentication
 */

// POST /api/v1/uploads/single (Upload 1 file)
router.post('/single', 
  authenticate,
  uploadMiddleware.uploadSingleImage.single('file'), 
  uploadMiddleware.handleUploadError,
  uploadController.uploadSingle
);

// POST /api/v1/uploads/multiple (Upload max 10 files)
router.post('/multiple',
  authenticate,
  uploadMiddleware.uploadMultipleImages.array('files', 10),
  uploadMiddleware.handleUploadError,
  uploadController.uploadMultiple
);

module.exports = router;
