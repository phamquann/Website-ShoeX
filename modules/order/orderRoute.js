const express = require('express');
const router = express.Router();
const orderController = require('./orderController');
const { authenticate, authorize } = require('../../middlewares/auth');

// User routes
router.get('/me', authenticate, orderController.getMyOrders);
router.get('/:id', authenticate, orderController.getOrderById);

// Admin/Staff routes
router.get('/', authenticate, authorize('ADMIN', 'STAFF'), orderController.getAllOrders);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'STAFF'), orderController.updateStatus);

module.exports = router;
