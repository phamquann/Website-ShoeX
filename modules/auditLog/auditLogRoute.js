const express = require('express');
const router = express.Router();
const auditLogController = require('./auditLogController');
const { authenticate, authorize } = require('../../middlewares/auth');

/**
 * Audit Log Routes - /api/v1/audit-logs
 * Authorized for ADMIN only
 */

// GET /api/v1/audit-logs
router.get('/', authenticate, authorize('ADMIN'), auditLogController.getLogs);

module.exports = router;
