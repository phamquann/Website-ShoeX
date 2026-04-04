const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cart',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productVariant',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  }
}, {
  timestamps: true
});

// 1 cart chỉ có 1 item cho mỗi variant
cartItemSchema.index({ cart: 1, variant: 1 }, { unique: true });

module.exports = mongoose.model('cartItem', cartItemSchema);
