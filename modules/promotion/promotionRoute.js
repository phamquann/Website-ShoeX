const express = require('express');
const router = express.Router();
const promotionController = require('./promotionController');
const { authenticate, authorize } = require('../../middlewares/auth');

router.get('/', promotionController.getAll);
router.get('/:id', promotionController.getById);

router.post('/', authenticate, authorize('ADMIN', 'STAFF'), promotionController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), promotionController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), promotionController.remove);

module.exports = router;
