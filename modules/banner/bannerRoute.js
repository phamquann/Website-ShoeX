const express = require('express');
const router = express.Router();
const bannerController = require('./bannerController');
const { authenticate, authorize } = require('../../middlewares/auth');
const uploadMiddleware = require('../../middlewares/upload');

router.get('/', bannerController.getAll);
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), bannerController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), bannerController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), bannerController.remove);

module.exports = router;
