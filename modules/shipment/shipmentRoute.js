const express = require('express');
const router = express.Router();
const shipmentController = require('./shipmentController');
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate, mongoIdRules } = require('../../middlewares/validator');

router.get('/', authenticate, authorize('ADMIN', 'STAFF'), shipmentController.getAll);
router.get('/order/:orderId', authenticate, mongoIdRules('orderId'), validate, shipmentController.getByOrder);
router.post('/order/:orderId', authenticate, authorize('ADMIN', 'STAFF'), mongoIdRules('orderId'), validate, shipmentController.createOrUpdate);

module.exports = router;
