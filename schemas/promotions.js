const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['product', 'category', 'brand', 'flash_sale'], required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'category' }],
  applicableBrands: [{ type: mongoose.Schema.Types.ObjectId, ref: 'brand' }],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('promotion', promotionSchema);
