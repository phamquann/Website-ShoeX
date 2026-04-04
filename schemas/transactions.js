const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'payment',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  transactionCode: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['payment', 'refund'],
    default: 'payment'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['cod', 'online_simulated'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

transactionSchema.index({ payment: 1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ transactionCode: 1 });

module.exports = mongoose.model('transaction', transactionSchema);
