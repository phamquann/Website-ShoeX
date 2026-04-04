const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: [true, 'Product is required']
  },

  // ===== EMBEDDED SIZE (gộp từ Size model) =====
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true
    // Ví dụ: "38", "39", "40", "41", "42"
  },

  // ===== EMBEDDED COLOR (gộp từ Color model) =====
  color: {
    name: {
      type: String,
      required: [true, 'Color name is required'],
      trim: true
    },
    hexCode: {
      type: String,
      default: '#000000',
      trim: true
    }
  },

  sku: {
    type: String,
    required: [true, 'Variant SKU is required'],
    unique: true,
    uppercase: true,
    trim: true
  },

  price: {
    type: Number,
    min: 0,
    default: 0
    // Override product price nếu > 0, không thì dùng product.salePrice
  },

  // ===== EMBEDDED INVENTORY (gộp từ Inventory model) =====
  stock: {
    type: Number,
    min: 0,
    default: 0
  },
  reserved: {
    type: Number,
    min: 0,
    default: 0
  },
  soldCount: {
    type: Number,
    min: 0,
    default: 0
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

// Virtual: available stock
productVariantSchema.virtual('available').get(function () {
  return this.stock - this.reserved;
});

// Compound unique: 1 product + 1 size + 1 color name = 1 variant
productVariantSchema.index({ product: 1, size: 1, 'color.name': 1 }, { unique: true });

module.exports = mongoose.model('productVariant', productVariantSchema);
