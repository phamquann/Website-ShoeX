const express = require('express');
const router = express.Router();
const cartController = require('./cartController');
const { authenticate } = require('../../middlewares/auth');

// Tất cả route cart đều cần đăng nhập
router.use(authenticate);

router.get('/me', cartController.getMyCart);
router.post('/items', cartController.addItem);
router.put('/items/:id', cartController.updateItem);
router.delete('/items/:id', cartController.removeItem);
router.delete('/clear', cartController.clearCart);

module.exports = router;
