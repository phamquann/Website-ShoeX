const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'order',
    required: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reservation'
  },
  method: {
    type: String,
    enum: ['cod', 'online_simulated'],
    required: [true, 'Payment method is required'],
    default: 'cod'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  providerResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  pendingAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  refundedAt: {
    type: Date,
    default: null
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('payment', paymentSchema);