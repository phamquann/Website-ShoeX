const express = require('express');
const router = express.Router();
const checkoutController = require('./checkoutController');
const { authenticate, authorize } = require('../../middlewares/auth');

router.post('/', authenticate, checkoutController.checkout);
router.post('/confirm-cod/:orderId', authenticate, authorize('ADMIN', 'STAFF'), checkoutController.confirmCodPayment);

module.exports = router;
