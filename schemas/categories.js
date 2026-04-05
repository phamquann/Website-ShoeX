const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    trim: true
  },
  image: {
    type: String,
    default: 'https://i.imgur.com/QkIa5tT.jpeg'
  },
  description: {
    type: String,
    default: ''
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

categorySchema.virtual('products', {
  ref: 'product',
  localField: '_id',
  foreignField: 'category'
});

module.exports = mongoose.model('category', categorySchema);