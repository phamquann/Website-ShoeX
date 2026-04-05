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
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    min: 0,
    default: 0
  },
  ratingBreakdown: {
    star1: { type: Number, min: 0, default: 0 },
    star2: { type: Number, min: 0, default: 0 },
    star3: { type: Number, min: 0, default: 0 },
    star4: { type: Number, min: 0, default: 0 },
    star5: { type: Number, min: 0, default: 0 }
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

const productVariantSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: [true, 'Product is required']
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true
  },
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
  },
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

productVariantSchema.virtual('available').get(function () {
  return this.stock - this.reserved;
});

productVariantSchema.index({ product: 1, size: 1, 'color.name': 1 }, { unique: true });

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Types.ObjectId,
    ref: 'product',
    required: true,
    unique: true
  },
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
  }
});

const productModel = mongoose.models.product || mongoose.model('product', productSchema);
const productVariantModel = mongoose.models.productVariant || mongoose.model('productVariant', productVariantSchema);
const inventoryModel = mongoose.models.inventory || mongoose.model('inventory', inventorySchema);

module.exports = productModel;
module.exports.ProductVariant = productVariantModel;
module.exports.Inventory = inventoryModel;