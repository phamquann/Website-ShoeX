const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  images: [{ type: String }],
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'order' } // Optional field to ensure bought condition
}, {
  timestamps: true
});

module.exports = mongoose.model('review', reviewSchema);
