const express = require('express');
const router = express.Router();
const reviewController = require('./reviewController');
const { authenticate } = require('../../middlewares/auth');
const { validate, mongoIdRules } = require('../../middlewares/validator');
const { body, query } = require('express-validator');
const uploadMiddleware = require('../../middlewares/upload');

const reviewCreateRules = [
	body('productId').notEmpty().withMessage('productId is required')
		.isMongoId().withMessage('productId must be a valid ID'),
	body('orderId').notEmpty().withMessage('orderId is required')
		.isMongoId().withMessage('orderId must be a valid ID'),
	body('rating').notEmpty().withMessage('rating is required')
		.isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
	body('comment').optional({ nullable: true }).isString().withMessage('comment must be a string')
		.isLength({ max: 1000 }).withMessage('comment must be at most 1000 characters')
];

const reviewUpdateRules = [
	body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
	body('comment').optional({ nullable: true }).isString().withMessage('comment must be a string')
		.isLength({ max: 1000 }).withMessage('comment must be at most 1000 characters')
];

const reviewableQueryRules = [
	query('reviewed').optional().isIn(['true', 'false']).withMessage('reviewed must be true or false'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be from 1 to 50')
];

router.get('/reviewable', authenticate, reviewableQueryRules, validate, reviewController.getReviewableItems);
router.get('/me', authenticate, reviewController.getMine);
router.post('/',
	authenticate,
	uploadMiddleware.uploadMultipleImages.array('images', 5),
	uploadMiddleware.handleUploadError,
	reviewCreateRules,
	validate,
	reviewController.create
);
router.put('/:id',
	authenticate,
	mongoIdRules(),
	uploadMiddleware.uploadMultipleImages.array('images', 5),
	uploadMiddleware.handleUploadError,
	reviewUpdateRules,
	validate,
	reviewController.update
);
router.delete('/:id', authenticate, mongoIdRules(), validate, reviewController.remove);

module.exports = router;
