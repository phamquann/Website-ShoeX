const express = require('express');
const router = express.Router();
const refundController = require('./refundController');
const { authenticate, authorize } = require('../../middlewares/auth');

router.post('/', authenticate, authorize('ADMIN', 'STAFF'), refundController.create);
router.get('/', authenticate, authorize('ADMIN', 'STAFF'), refundController.getAll);
router.get('/order/:orderId', authenticate, refundController.getByOrder);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), refundController.updateStatus);

module.exports = router;
