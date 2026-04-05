const mongoose = require('mongoose');
const cartModel = require('../../schemas/carts');
const productModel = require('../../schemas/products');
const variantModel = productModel.ProductVariant;
const orderModel = require('../../schemas/orders');
const reservationModel = orderModel.Reservation;
const paymentModel = orderModel.Payment;
const transactionModel = orderModel.Transaction;
const userModel = require('../../schemas/users');
const discountModel = require('../../schemas/discounts');
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const crypto = require('crypto');
const { checkoutIdempotencyBloom } = require('../../utils/idempotencyBloom');

class CheckoutError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'CheckoutError';
    this.statusCode = statusCode;
  }
}

const TX_OPTIONS = {
  readPreference: 'primary',
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' }
};

const getAddressFromUser = (userDoc, addressId) => {
  if (!userDoc || !Array.isArray(userDoc.addresses)) return null;
  return userDoc.addresses.find(
    (address) => address._id.toString() === addressId.toString() && !address.isDeleted
  ) || null;
};

const normalizeIdempotencyKey = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isTransactionNotSupportedError = (error) => {
  const message = `${error?.message || ''}`.toLowerCase();
  return message.includes('transaction numbers are only allowed on a replica set member or mongos')
    || message.includes('replica set')
    || message.includes('transaction is not supported');
};

const getSessionOptions = (session) => (session ? { session } : {});

const findExistingOrderByIdempotency = async (idempotencyKey) => {
  const existingOrder = await orderModel.findOne({ idempotencyKey });
  if (!existingOrder) return null;
  return existingOrder.populate('payment');
};


/**
 * Tạo mã đơn hàng unique
 */
const generateOrderCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SX-${timestamp}-${random}`;
};

/**
 * Tạo mã giao dịch unique
 */
const generateTransactionCode = () => {
  return `TXN-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

const processCheckoutFlow = async ({ req, userId, addressId, paymentMethod, note, idempotencyKey, couponCode, session }) => {
  const sessionOptions = getSessionOptions(session);

  // ===== 1. VALIDATE ADDRESS =====
  const userAddressQuery = userModel.findById(userId).select('addresses');
  if (session) userAddressQuery.session(session);
  const userWithAddresses = await userAddressQuery;

  const address = getAddressFromUser(userWithAddresses, addressId);
  if (!address) {
    throw new CheckoutError('Shipping address not found', 404);
  }

  // ===== 2. GET CART ITEMS =====
  const cartQuery = cartModel.findOne({ user: userId });
  if (session) cartQuery.session(session);
  const cart = await cartQuery;
  if (!cart) {
    throw new CheckoutError('Cart not found');
  }

  await cart.populate([
    {
      path: 'items.product',
      select: 'name slug thumbnail salePrice originalPrice isActive isDeleted'
    },
    {
      path: 'items.variant',
      select: 'size color sku price stock reserved isDeleted'
    }
  ]);

  const cartItems = cart.items || [];
  const validItems = cartItems.filter((item) =>
    item.product && !item.product.isDeleted && item.product.isActive
    && item.variant && !item.variant.isDeleted
  );

  if (validItems.length === 0) {
    throw new CheckoutError('Cart is empty or all items are unavailable');
  }

  // ===== 3. VALIDATE STOCK & PREPARE DATA =====
  const reservationItems = [];
  const orderItems = [];
  let totalAmount = 0;

  for (const item of validItems) {
    const unitPrice = item.variant.price > 0 ? item.variant.price : item.product.salePrice;
    const available = item.variant.stock - item.variant.reserved;

    if (available < item.quantity) {
      throw new CheckoutError(
        `Not enough stock for "${item.product.name}" (${item.variant.color.name}, size ${item.variant.size}). Available: ${available}, requested: ${item.quantity}`
      );
    }

    const subtotal = unitPrice * item.quantity;
    totalAmount += subtotal;

    reservationItems.push({
      product: item.product._id,
      variant: item.variant._id,
      quantity: item.quantity,
      price: unitPrice,
      subtotal
    });

    orderItems.push({
      product: item.product._id,
      variant: item.variant._id,
      productName: item.product.name,
      variantInfo: {
        size: item.variant.size,
        color: item.variant.color.name,
        sku: item.variant.sku
      },
      thumbnail: item.product.thumbnail,
      quantity: item.quantity,
      price: unitPrice,
      subtotal
    });
  }

  // ===== 4. APPLY COUPON =====
  let appliedCouponId = null;
  let discountAmount = 0;
  const trimmedCoupon = couponCode ? couponCode.toString().trim() : '';

  if (trimmedCoupon) {
    const couponQuery = discountModel.findOne({
      kind: 'coupon',
      code: trimmedCoupon.toUpperCase(),
      isActive: true
    });
    if (session) couponQuery.session(session);
    const coupon = await couponQuery;

    if (!coupon) {
      throw new CheckoutError('Mã giảm giá không hợp lệ hoặc đã bị vô hiệu hóa');
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new CheckoutError('Mã giảm giá đã hết hạn hoặc chưa được kích hoạt');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new CheckoutError('Mã giảm giá đã hết lượt sử dụng');
    }
    if (coupon.minOrderValue && totalAmount < coupon.minOrderValue) {
      throw new CheckoutError(`Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString()}đ mới được áp dụng mã này`);
    }

    if (coupon.applicableUsers && coupon.applicableUsers.length > 0) {
      const isEligible = coupon.applicableUsers.some((u) => u.toString() === userId.toString());
      if (!isEligible) {
        throw new CheckoutError('Bạn không đủ điều kiện sử dụng mã giảm giá này');
      }
    }

    if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    } else {
      discountAmount = (totalAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    }

    discountAmount = Math.round(discountAmount);
    totalAmount = Math.max(0, totalAmount - discountAmount);
    appliedCouponId = coupon._id;

    coupon.usedCount += 1;
    await coupon.save(sessionOptions);
  }

  // ===== 5. CREATE RESERVATION =====
  const reservation = new reservationModel({
    user: userId,
    items: reservationItems,
    totalAmount,
    idempotencyKey: `RSV-${idempotencyKey}`,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  await reservation.save(sessionOptions);

  // ===== 6. ATOMIC RESERVE STOCK =====
  for (const item of reservationItems) {
    const reserveQuery = {
      _id: item.variant,
      isDeleted: false,
      $expr: { $gte: [{ $subtract: ['$stock', '$reserved'] }, item.quantity] }
    };

    const reserveResult = await variantModel.findOneAndUpdate(
      reserveQuery,
      { $inc: { reserved: item.quantity } },
      { new: true, ...sessionOptions }
    );

    if (!reserveResult) {
      throw new CheckoutError('Stock reservation failed - please try again');
    }
  }

  // ===== 7. CREATE ORDER =====
  const orderCode = generateOrderCode();
  const order = new orderModel({
    user: userId,
    orderCode,
    items: orderItems,
    shippingAddress: {
      fullName: address.fullName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      addressDetail: address.addressDetail,
      note
    },
    status: 'pending',
    totalAmount,
    coupon: appliedCouponId,
    discountAmount,
    reservation: reservation._id,
    idempotencyKey,
    note
  });
  await order.save(sessionOptions);

  // ===== 8. CREATE PAYMENT =====
  const payment = new paymentModel({
    user: userId,
    order: order._id,
    reservation: reservation._id,
    method: paymentMethod,
    amount: totalAmount,
    status: 'pending',
    idempotencyKey: `PAY-${idempotencyKey}`
  });
  await payment.save(sessionOptions);

  // ===== 9. CREATE TRANSACTION =====
  const transactionCode = generateTransactionCode();
  const transaction = new transactionModel({
    payment: payment._id,
    order: order._id,
    user: userId,
    transactionCode,
    type: 'payment',
    amount: totalAmount,
    status: 'pending',
    method: paymentMethod,
    description: `Payment for order ${orderCode}`,
    idempotencyKey: `TXN-${idempotencyKey}`
  });
  await transaction.save(sessionOptions);

  // ===== 10. SIMULATE ONLINE PAYMENT =====
  if (paymentMethod === 'online_simulated') {
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.providerResponse = {
      simulatedGateway: 'success',
      approvalCode: crypto.randomBytes(6).toString('hex')
    };
    await payment.save(sessionOptions);

    await transactionModel.findByIdAndUpdate(
      transaction._id,
      { status: 'success', processedAt: new Date() },
      sessionOptions
    );

    order.status = 'confirmed';
    await order.save(sessionOptions);
  }

  // ===== 11. CONVERT RESERVATION =====
  reservation.status = 'converted';
  await reservation.save(sessionOptions);

  // ===== 12. UPDATE STOCK AFTER PAID ONLINE =====
  if (paymentMethod === 'online_simulated') {
    for (const item of reservationItems) {
      await variantModel.findByIdAndUpdate(
        item.variant,
        { $inc: { reserved: -item.quantity, soldCount: item.quantity, stock: -item.quantity } },
        sessionOptions
      );
    }
  }

  // ===== 13. CLEAR CART =====
  cart.items = [];
  await cart.save(sessionOptions);

  order.payment = payment._id;
  await order.save(sessionOptions);

  return {
    orderId: order._id,
    orderCode,
    totalAmount,
    transactionCode
  };
};

/**
 * POST /api/v1/checkout
 * Luồng: Cart -> Reservation (giữ hàng) -> Payment -> Order
 * Body: { addressId, paymentMethod, note?, idempotencyKey }
 */
const checkout = async (req, res) => {
  let idempotencyKey = '';
  try {
    const {
      addressId,
      paymentMethod = 'cod',
      note = '',
      couponCode
    } = req.body;
    const userId = req.user._id;
    idempotencyKey = normalizeIdempotencyKey(req.body.idempotencyKey);

    // ===== 1. IDEMPOTENCY CHECK =====
    if (!idempotencyKey) {
      return response.badRequest(res, 'idempotencyKey is required to prevent duplicate orders');
    }

    const bloomMaybeExists = checkoutIdempotencyBloom.mightContain(idempotencyKey);
    if (bloomMaybeExists) {
      const existingOrder = await findExistingOrderByIdempotency(idempotencyKey);
      if (existingOrder) {
        return response.success(res, existingOrder, 'Order already created (idempotent response)');
      }
    }

    if (!addressId) {
      return response.badRequest(res, 'addressId is required');
    }

    let flowResult;
    let usedTransaction = false;

    const session = await mongoose.startSession();
    try {
      try {
        await session.withTransaction(async () => {
          flowResult = await processCheckoutFlow({
            req,
            userId,
            addressId,
            paymentMethod,
            note,
            idempotencyKey,
            couponCode,
            session
          });
        }, TX_OPTIONS);
        usedTransaction = true;
      } catch (txError) {
        if (!isTransactionNotSupportedError(txError)) {
          throw txError;
        }

        console.warn('[CHECKOUT] MongoDB transaction is unavailable. Fallback to non-transaction flow.');
        flowResult = await processCheckoutFlow({
          req,
          userId,
          addressId,
          paymentMethod,
          note,
          idempotencyKey,
          couponCode,
          session: null
        });
      }
    } finally {
      await session.endSession();
    }

    checkoutIdempotencyBloom.add(idempotencyKey);

    const createdOrder = await orderModel.findById(flowResult.orderId).populate('payment');
    await logAction(
      req,
      'CREATE',
      'order',
      flowResult.orderId,
      `Created order ${flowResult.orderCode} - ${flowResult.totalAmount.toLocaleString()}đ`
    );

    return response.created(
      res,
      {
        order: createdOrder,
        transactionCode: flowResult.transactionCode,
        usedTransaction
      },
      'Checkout successful! Order created.'
    );
  } catch (error) {
    if (error?.code === 11000 && idempotencyKey) {
      const existingOrder = await findExistingOrderByIdempotency(idempotencyKey);
      if (existingOrder) {
        checkoutIdempotencyBloom.add(idempotencyKey);
        return response.success(res, existingOrder, 'Order already created (idempotent response)');
      }
    }

    if (error instanceof CheckoutError) {
      if (error.statusCode === 404) {
        return response.notFound(res, error.message);
      }
      if (error.statusCode === 403) {
        return response.forbidden(res, error.message);
      }
      return response.badRequest(res, error.message);
    }

    console.error('[CHECKOUT ERROR]', error.message, error.stack);
    return response.serverError(res, `Checkout failed: ${error.message}`, error);
  }
};

/**
 * POST /api/v1/checkout/confirm-cod/:orderId
 * Admin confirms COD payment received
 */
const confirmCodPayment = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.orderId);
    if (!order) return response.notFound(res, 'Order not found');
    if (order.status === 'cancelled') return response.badRequest(res, 'Order is cancelled');

    const payment = await paymentModel.findOne({ order: order._id });
    if (!payment) return response.notFound(res, 'Payment not found');
    if (payment.method !== 'cod') return response.badRequest(res, 'Not a COD order');
    if (payment.status === 'paid') return response.badRequest(res, 'Already paid');

    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    await transactionModel.findOneAndUpdate(
      { payment: payment._id },
      { status: 'success', processedAt: new Date() }
    );

    // Trừ kho thật
    const reservation = await reservationModel.findById(order.reservation);
    if (reservation) {
      for (const item of reservation.items) {
        await variantModel.findByIdAndUpdate(item.variant, {
          $inc: { reserved: -item.quantity, soldCount: item.quantity, stock: -item.quantity }
        });
      }
    }

    await logAction(req, 'UPDATE', 'payment', payment._id, `Confirmed COD payment for order ${order.orderCode}`);
    return response.success(res, payment, 'COD payment confirmed');
  } catch (error) {
    return response.serverError(res, 'Failed to confirm payment', error);
  }
};

module.exports = { checkout, confirmCodPayment };
