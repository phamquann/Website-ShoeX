const express = require('express');
const router = express.Router();
const variantController = require('./productVariantController');
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate, mongoIdRules } = require('../../middlewares/validator');
const { body } = require('express-validator');

const variantCreateRules = [
  body('product').isMongoId().withMessage('Product must be a valid ID'),
  body('size').trim().notEmpty().withMessage('Size is required (e.g. "39", "40")'),
  body('colorName').trim().notEmpty().withMessage('Color name is required'),
  body('sku').trim().notEmpty().withMessage('Variant SKU is required')
];

const quantityRules = [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
];

// ===== PUBLIC =====
router.get('/', variantController.getByProduct);
router.get('/:id', mongoIdRules(), validate, variantController.getById);
router.get('/:id/check-stock', mongoIdRules(), validate, variantController.checkStock);

// ===== PROTECTED - CRUD =====
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), variantCreateRules, validate, variantController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules(), validate, variantController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), mongoIdRules(), validate, variantController.remove);

// ===== PROTECTED - INVENTORY OPERATIONS =====
router.put('/:id/restock', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules(), quantityRules, validate, variantController.restock);
router.put('/:id/reserve', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules(), quantityRules, validate, variantController.reserve);
router.put('/:id/release', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules(), quantityRules, validate, variantController.release);
router.put('/:id/sold', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules(), quantityRules, validate, variantController.sold);

module.exports = router;
