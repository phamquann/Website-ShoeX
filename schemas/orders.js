const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productVariant',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  variantInfo: {
    size: String,
    color: String,
    sku: String
  },
  thumbnail: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

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

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  orderCode: {
    type: String,
    required: true,
    unique: true,
    sparse: true
  },
  items: {
    type: [orderItemSchema],
    required: true
  },
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'discount'
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  shippingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  note: {
    type: String,
    default: '',
    trim: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reservation'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'payment'
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  isReceivedConfirmed: {
    type: Boolean,
    default: false
  },
  receivedConfirmedAt: {
    type: Date,
    default: null
  },
  cancelReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

const reservationItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productVariant',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  items: {
    type: [reservationItemSchema],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'converted'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000)
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  idempotencyKey: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
reservationSchema.index({ user: 1, status: 1 });

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'order',
    required: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reservation'
  },
  method: {
    type: String,
    enum: ['cod', 'online_simulated'],
    required: [true, 'Payment method is required'],
    default: 'cod'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  providerResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  pendingAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  refundedAt: {
    type: Date,
    default: null
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1, status: 1 });

const transactionSchema = new mongoose.Schema({
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'payment',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  transactionCode: {
    type: String,
    required: true,
    unique: true,
    sparse: true
  },
  type: {
    type: String,
    enum: ['payment', 'refund'],
    default: 'payment'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['cod', 'online_simulated'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

transactionSchema.index({ payment: 1 });
transactionSchema.index({ order: 1 });

const shipmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true, unique: true },
  shippingProvider: { type: String, required: true },
  trackingNumber: { type: String, required: true },
  status: { type: String, enum: ['preparing', 'picked_up', 'delivering', 'delivered', 'failed'], default: 'preparing' },
  estimatedDeliveryDate: { type: Date }
}, { timestamps: true });

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  reason: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  images: [{ type: String }],
  requestedAmount: { type: Number, default: 0 },
  refundMethod: { type: String, enum: ['bank_transfer', 'cash'], default: 'bank_transfer' },
  refundBankName: { type: String, default: '' },
  refundAccountName: { type: String, default: '' },
  refundAccountNumber: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  adminNote: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null }
}, { timestamps: true });

const refundSchema = new mongoose.Schema({
  returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'returnRequest', required: true, unique: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'bank_transfer' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  transactionId: { type: String, default: '' },
  adminNote: { type: String, default: '' },
  processedAt: { type: Date, default: null }
}, { timestamps: true });

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema);
const reservationModel = mongoose.models.reservation || mongoose.model('reservation', reservationSchema);
const paymentModel = mongoose.models.payment || mongoose.model('payment', paymentSchema);
const transactionModel = mongoose.models.transaction || mongoose.model('transaction', transactionSchema);
const shipmentModel = mongoose.models.shipment || mongoose.model('shipment', shipmentSchema);
const returnRequestModel = mongoose.models.returnRequest || mongoose.model('returnRequest', returnRequestSchema);
const refundModel = mongoose.models.refund || mongoose.model('refund', refundSchema);

module.exports = orderModel;
module.exports.Reservation = reservationModel;
module.exports.Payment = paymentModel;
module.exports.Transaction = transactionModel;
module.exports.Shipment = shipmentModel;
module.exports.ReturnRequest = returnRequestModel;
module.exports.Refund = refundModel;
