const express = require('express');
const router = express.Router();
const roleController = require('./roleController');
const { authenticate, authorize } = require('../../middlewares/auth');

/**
 * Role & Permission Routes - /api/v1/roles
 * Authorized for ADMIN only
 */
router.use(authenticate, authorize('ADMIN'));

// ROLES
router.get('/', roleController.getRoles);
router.post('/', roleController.createRole);
router.put('/:id/permissions', roleController.assignPermissionsToRole);

// PERMISSIONS
router.get('/permissions', roleController.getPermissions);
router.post('/permissions', roleController.createPermission);

module.exports = router;
