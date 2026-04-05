const express = require('express');
const router = express.Router();
const productController = require('./productController');
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate, mongoIdRules } = require('../../middlewares/validator');
const { body } = require('express-validator');
const uploadMiddleware = require('../../middlewares/upload');
const reviewController = require('../review/reviewController');

const productCreateRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('originalPrice').isNumeric().withMessage('Original price must be a number'),
  body('brand').isMongoId().withMessage('Brand must be a valid ID'),
  body('category').isMongoId().withMessage('Category must be a valid ID')
];

// ===== PUBLIC ROUTES =====
router.get('/', productController.getAll);
router.get('/slug/:slug', productController.getBySlug);
router.get('/:id', mongoIdRules(), validate, productController.getById);

// ===== REVIEWS =====
router.get('/:id/reviews', reviewController.getByProduct);
router.post('/:id/reviews', authenticate, reviewController.createForProduct);

// ===== PROTECTED - CRUD =====
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), productCreateRules, validate, productController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules(), validate, productController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), mongoIdRules(), validate, productController.remove);

// ===== PROTECTED - IMAGE MANAGEMENT (embedded) =====
router.post('/:id/images',
  authenticate, authorize('ADMIN', 'STAFF'),
  uploadMiddleware.uploadSingleImage.single('file'),
  uploadMiddleware.handleUploadError,
  productController.addImage
);

router.post('/:id/images/multiple',
  authenticate, authorize('ADMIN', 'STAFF'),
  uploadMiddleware.uploadMultipleImages.array('files', 10),
  uploadMiddleware.handleUploadError,
  productController.addMultipleImages
);

router.put('/:id/images/:imageId', authenticate, authorize('ADMIN', 'STAFF'), productController.updateImage);
router.delete('/:id/images/:imageId', authenticate, authorize('ADMIN'), productController.removeImage);

module.exports = router;
