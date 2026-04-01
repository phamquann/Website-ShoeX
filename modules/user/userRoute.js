const express = require('express');
const router = express.Router();
const userController = require('./userController');
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate, mongoIdRules } = require('../../middlewares/validator');

/**
 * User Routes - /api/v1/users
 * All routes require authentication
 */

// GET /api/v1/users           - Admin/Staff: list all users
router.get('/', authenticate, authorize('ADMIN', 'STAFF'), userController.getAllUsers);

// GET /api/v1/users/:id       - Admin: get specific user
router.get('/:id', authenticate, authorize('ADMIN'), mongoIdRules('id'), validate, userController.getUserById);

// POST /api/v1/users          - Admin: create user (admin-created accounts)
router.post('/', authenticate, authorize('ADMIN'), userController.createUser);

// PUT /api/v1/users/:id       - Admin: update user info
router.put('/:id', authenticate, authorize('ADMIN'), mongoIdRules('id'), validate, userController.updateUser);

// PATCH /api/v1/users/:id/toggle-status  - Admin: lock/unlock
router.patch('/:id/toggle-status', authenticate, authorize('ADMIN'), mongoIdRules('id'), validate, userController.toggleStatus);

// DELETE /api/v1/users/:id    - Admin: soft delete
router.delete('/:id', authenticate, authorize('ADMIN'), mongoIdRules('id'), validate, userController.deleteUser);

module.exports = router;
