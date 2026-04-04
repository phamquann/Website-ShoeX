const mongoose = require('mongoose');

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Receiver name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  province: {
    type: String,
    required: [true, 'Province is required'],
    trim: true
  },
  district: {
    type: String,
    required: [true, 'District is required'],
    trim: true
  },
  ward: {
    type: String,
    required: [true, 'Ward is required'],
    trim: true
  },
  addressDetail: {
    type: String,
    required: [true, 'Address detail is required'],
    trim: true
  },
  note: {
    type: String,
    default: '',
    trim: true
  }
}, { _id: false });

module.exports = shippingAddressSchema;
