const express = require('express');
const router = express.Router();
const userAddressController = require('./userAddressController');
const { authenticate } = require('../../middlewares/auth');
const { validate, userAddressRules, mongoIdRules } = require('../../middlewares/validator');

/**
 * UserAddress Routes - /api/v1/user-addresses
 * All routes require authentication
 * Users can only manage their own addresses
 */

// GET /api/v1/user-addresses (List all addresses of current user)
router.get('/', authenticate, userAddressController.getMyAddresses);

// supply rules and validate middleware
// POST /api/v1/user-addresses (Create address)
router.post('/', authenticate, userAddressRules, validate, userAddressController.createAddress);

// PUT /api/v1/user-addresses/:id (Update address by ID)
router.put('/:id', authenticate, mongoIdRules('id'), userAddressRules, validate, userAddressController.updateAddress);

// DELETE /api/v1/user-addresses/:id (Delete address)
router.delete('/:id', authenticate, mongoIdRules('id'), validate, userAddressController.deleteAddress);

module.exports = router;
