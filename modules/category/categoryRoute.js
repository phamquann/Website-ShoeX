const express = require('express');
const router = express.Router();
const categoryController = require('./categoryController');
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate, mongoIdRules } = require('../../middlewares/validator');
const { body } = require('express-validator');

const categoryRules = [
  body('name').trim().notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Category name must be 2-50 characters')
];

// Public
router.get('/', categoryController.getAll);
router.get('/:id', mongoIdRules(), validate, categoryController.getById);
router.get('/:id/products', mongoIdRules(), validate, categoryController.getProducts);

// Protected
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), categoryRules, validate, categoryController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules(), validate, categoryController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), mongoIdRules(), validate, categoryController.remove);

module.exports = router;
