const mongoose = require('mongoose');

const reservationItemSchema = new mongoose.Schema({
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
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  items: {
    type: [reservationItemSchema],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'converted'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 phút
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  idempotencyKey: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// Auto-expire reservations
reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
reservationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('reservation', reservationSchema);