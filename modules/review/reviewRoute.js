const express = require('express');
const router = express.Router();
const reviewController = require('./reviewController');
const { authenticate } = require('../../middlewares/auth');

router.get('/me', authenticate, reviewController.getMine);
router.put('/:id', authenticate, reviewController.update);
router.delete('/:id', authenticate, reviewController.remove);

module.exports = router;
