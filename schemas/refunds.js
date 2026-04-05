const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'returnRequest', required: true, unique: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'bank_transfer' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  transactionId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('refund', refundSchema);
