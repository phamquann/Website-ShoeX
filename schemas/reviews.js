const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', trim: true, maxlength: 1000 },
  images: {
    type: [{ type: String, trim: true }],
    validate: {
      validator: (value) => Array.isArray(value) && value.length <= 5,
      message: 'A review can contain at most 5 images'
    },
    default: []
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

reviewSchema.index({ product: 1, created_at: -1 });
reviewSchema.index({ user: 1, created_at: -1 });
reviewSchema.index({ user: 1, order: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('review', reviewSchema);
