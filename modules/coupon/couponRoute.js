const express = require('express');
const router = express.Router();
const couponController = require('./couponController');
const { authenticate, authorize } = require('../../middlewares/auth');

router.post('/check', authenticate, couponController.checkEligibility);

// CRUD cho Admin
router.get('/', authenticate, authorize('ADMIN', 'STAFF'), couponController.getAll);
router.get('/:id', authenticate, authorize('ADMIN', 'STAFF'), couponController.getById);
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), couponController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), couponController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), couponController.remove);

module.exports = router;
