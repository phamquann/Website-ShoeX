const express = require('express');
const router = express.Router();
const wishlistController = require('./wishlistController');
const { authenticate } = require('../../middlewares/auth');

router.get('/me', authenticate, wishlistController.getMine);
router.post('/', authenticate, wishlistController.add);
router.delete('/:id', authenticate, wishlistController.remove);

module.exports = router;
