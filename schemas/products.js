const mongoose = require('mongoose');

// Sub-document: Product Image (embedded thay vì collection riêng)
const productImageSubSchema = new mongoose.Schema({
  url: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: 0
  },
  salePrice: {
    type: Number,
    min: 0,
    default: 0
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brand',
    required: [true, 'Brand is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'category',
    required: [true, 'Category is required']
  },
  thumbnail: {
    type: String,
    default: 'https://i.imgur.com/cHddUCu.jpeg'
  },
  // ===== EMBEDDED IMAGES (gộp từ ProductImage) =====
  images: {
    type: [productImageSubSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: variants
productSchema.virtual('variants', {
  ref: 'productVariant',
  localField: '_id',
  foreignField: 'product'
});

// Index for search & filter
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ brand: 1, category: 1, isDeleted: 1 });

module.exports = mongoose.model('product', productSchema);