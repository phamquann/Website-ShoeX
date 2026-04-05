const express = require('express');
const router = express.Router();
const shipmentController = require('./shipmentController');
const { authenticate, authorize } = require('../../middlewares/auth');

router.get('/', authenticate, authorize('ADMIN', 'STAFF'), shipmentController.getAll);
router.get('/order/:orderId', authenticate, shipmentController.getByOrder);
router.post('/order/:orderId', authenticate, authorize('ADMIN', 'STAFF'), shipmentController.createOrUpdate);

module.exports = router;
