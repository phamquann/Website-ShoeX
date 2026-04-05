const express = require('express');
const router = express.Router();
const notificationController = require('./notificationController');
const { authenticate, authorize } = require('../../middlewares/auth');

/**
 * Notification Routes - /api/v1/notifications
 * All routes require authentication
 */

// User routes
router.get('/', authenticate, notificationController.getMyNotifications);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);
router.patch('/:id/read', authenticate, notificationController.markAsRead);

// Admin push notification route
router.post('/system', authenticate, authorize('ADMIN'), notificationController.pushSystemNotification);

module.exports = router;
