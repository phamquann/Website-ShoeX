const express = require('express');
const router = express.Router();
const productController = require('./productController');
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate, mongoIdRules } = require('../../middlewares/validator');
const { body, query } = require('express-validator');
const uploadMiddleware = require('../../middlewares/upload');
const reviewController = require('../review/reviewController');

const productCreateRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('originalPrice').isNumeric().withMessage('Original price must be a number'),
  body('brand').isMongoId().withMessage('Brand must be a valid ID'),
  body('category').isMongoId().withMessage('Category must be a valid ID')
];

const reviewCreateRules = [
  body('orderId').notEmpty().withMessage('orderId is required')
    .isMongoId().withMessage('orderId must be a valid ID'),
  body('rating').notEmpty().withMessage('rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
  body('comment').optional({ checkFalsy: true })
    .isString().withMessage('comment must be a string')
    .isLength({ max: 1000 }).withMessage('comment must be at most 1000 characters')
];

const reviewQueryRules = [
  query('star').optional().isInt({ min: 1, max: 5 }).withMessage('star must be between 1 and 5'),
  query('hasImages').optional().isIn(['true', 'false']).withMessage('hasImages must be true or false'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be from 1 to 50')
];

// ===== PUBLIC ROUTES =====
router.get('/', productController.getAll);
router.get('/slug/:slug', productController.getBySlug);
router.get('/:id', mongoIdRules(), validate, productController.getById);

// ===== REVIEWS =====
router.get('/:id/reviews', mongoIdRules(), reviewQueryRules, validate, reviewController.getByProduct);
router.get('/:id/reviews/summary', mongoIdRules(), validate, reviewController.getSummaryByProduct);
router.post('/:id/reviews',
  authenticate,
  mongoIdRules(),
  uploadMiddleware.uploadMultipleImages.array('images', 5),
  uploadMiddleware.handleUploadError,
  reviewCreateRules,
  validate,
  reviewController.createForProduct
);

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
