const express = require('express');
const router = express.Router();
const brandController = require('./brandController');
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate, mongoIdRules } = require('../../middlewares/validator');
const { body } = require('express-validator');

// Validation rules
const brandRules = [
  body('name').trim().notEmpty().withMessage('Brand name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Brand name must be 2-50 characters')
];

// Public routes
router.get('/', brandController.getAll);
router.get('/:id', mongoIdRules(), validate, brandController.getById);

// Protected routes (Admin/Staff)
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), brandRules, validate, brandController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules(), brandRules, validate, brandController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), mongoIdRules(), validate, brandController.remove);

module.exports = router;
