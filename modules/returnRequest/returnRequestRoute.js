const express = require('express');
const router = express.Router();
const returnRequestController = require('./returnRequestController');
const { authenticate, authorize } = require('../../middlewares/auth');

router.post('/', authenticate, returnRequestController.create);
router.get('/', authenticate, returnRequestController.getAll);
router.put('/:id/status', authenticate, authorize('ADMIN', 'STAFF'), returnRequestController.updateStatus);

module.exports = router;
