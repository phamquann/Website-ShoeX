const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['coupon', 'promotion'],
    required: true,
    index: true
  },
  code: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['product', 'category', 'brand', 'flash_sale'],
    default: undefined
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderValue: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    default: null,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: null,
    min: 0
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'category' }],
  applicableBrands: [{ type: mongoose.Schema.Types.ObjectId, ref: 'brand' }]
}, {
  timestamps: true
});

discountSchema.index(
  { kind: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { kind: 'coupon', code: { $exists: true, $type: 'string' } }
  }
);

discountSchema.index({ kind: 1, isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('discount', discountSchema);
