const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true, unique: true },
  shippingProvider: { type: String, required: true },
  trackingNumber: { type: String, required: true },
  status: { type: String, enum: ['preparing', 'picked_up', 'delivering', 'delivered', 'failed'], default: 'preparing' },
  estimatedDeliveryDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('shipment', shipmentSchema);
