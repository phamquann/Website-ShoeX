const mongoose = require('mongoose');
const shippingAddressSchema = require('./shippingAddresses');
const orderItemSchema = require('./orderItems');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  orderCode: {
    type: String,
    required: true,
    unique: true
  },
  items: {
    type: [orderItemSchema],
    required: true
  },
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  shippingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  note: {
    type: String,
    default: '',
    trim: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reservation'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'payment'
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderCode: 1 });

module.exports = mongoose.model('order', orderSchema);
