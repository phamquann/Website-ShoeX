const mongoose = require('mongoose');
const cartModel = require('../../schemas/carts');
const cartItemModel = require('../../schemas/cartItems');
const variantModel = require('../../schemas/productVariants');
const reservationModel = require('../../schemas/reservations');
const orderModel = require('../../schemas/orders');
const paymentModel = require('../../schemas/payments');
const transactionModel = require('../../schemas/transactions');
const userAddressModel = require('../../schemas/userAddresses');
const couponModel = require('../../schemas/coupons');
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const crypto = require('crypto');

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

/**
 * POST /api/v1/checkout
 * Luồng: Cart -> Reservation (giữ hàng) -> Payment -> Order
 * Body: { addressId, paymentMethod, note?, idempotencyKey }
 */
const checkout = async (req, res) => {
  try {
    const { addressId, paymentMethod = 'cod', note = '', idempotencyKey, couponCode } = req.body;
    const userId = req.user._id;

    // ===== 1. IDEMPOTENCY CHECK =====
    if (!idempotencyKey) {
      return response.badRequest(res, 'idempotencyKey is required to prevent duplicate orders');
    }

    // Kiểm tra xem đã có order với key này chưa
    const existingOrder = await orderModel.findOne({ idempotencyKey });
    if (existingOrder) {
      const populated = await existingOrder.populate('payment');
      return response.success(res, populated, 'Order already created (idempotent response)');
    }

    // ===== 2. VALIDATE ADDRESS =====
    if (!addressId) {
      return response.badRequest(res, 'addressId is required');
    }
    const address = await userAddressModel.findOne({ _id: addressId, user: userId, isDeleted: false });
    if (!address) {
      return response.notFound(res, 'Shipping address not found');
    }

    // ===== 3. GET CART ITEMS =====
    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return response.badRequest(res, 'Cart not found');
    }

    const cartItems = await cartItemModel.find({ cart: cart._id })
      .populate({
        path: 'product',
        select: 'name slug thumbnail salePrice originalPrice isActive isDeleted'
      })
      .populate({
        path: 'variant',
        select: 'size color sku price stock reserved isDeleted'
      });

    const validItems = cartItems.filter(item =>
      item.product && !item.product.isDeleted && item.product.isActive &&
      item.variant && !item.variant.isDeleted
    );

    if (validItems.length === 0) {
      return response.badRequest(res, 'Cart is empty or all items are unavailable');
    }

    // ===== 4. VALIDATE STOCK & PREPARE DATA =====
    const reservationItems = [];
    const orderItems = [];
    let totalAmount = 0;

    for (const item of validItems) {
      const unitPrice = item.variant.price > 0 ? item.variant.price : item.product.salePrice;
      const available = item.variant.stock - item.variant.reserved;

      if (available < item.quantity) {
        return response.badRequest(res,
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

    // ===== 4.5 APPLY COUPON =====
    let appliedCouponId = null;
    let discountAmount = 0;
    const trimmedCoupon = couponCode ? couponCode.toString().trim() : '';
    if (trimmedCoupon) {
      const coupon = await couponModel.findOne({ code: trimmedCoupon.toUpperCase(), isActive: true });
      if (!coupon) return response.badRequest(res, 'Mã giảm giá không hợp lệ hoặc đã bị vô hiệu hóa');
      
      const now = new Date();
      if (now < coupon.startDate || now > coupon.endDate) return response.badRequest(res, 'Mã giảm giá đã hết hạn hoặc chưa được kích hoạt');
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return response.badRequest(res, 'Mã giảm giá đã hết lượt sử dụng');
      if (coupon.minOrderValue && totalAmount < coupon.minOrderValue) return response.badRequest(res, `Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString()}đ mới được áp dụng mã này`);
      
      if (coupon.applicableUsers && coupon.applicableUsers.length > 0) {
        const isEligible = coupon.applicableUsers.some(u => u.toString() === userId.toString());
        if (!isEligible) {
          return response.badRequest(res, 'Bạn không đủ điều kiện sử dụng mã giảm giá này');
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

      // Increment used count
      coupon.usedCount += 1;
      await coupon.save();
    }

    // ===== 5. CREATE RESERVATION (giữ hàng) =====
    const reservation = await reservationModel.create({
      user: userId,
      items: reservationItems,
      totalAmount,
      idempotencyKey: `RSV-${idempotencyKey}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 phút
    });

    // ===== 6. ATOMIC RESERVE STOCK =====
    try {
      for (const item of reservationItems) {
        const result = await variantModel.findOneAndUpdate(
          {
            _id: item.variant,
            isDeleted: false,
            $expr: { $gte: [{ $subtract: ['$stock', '$reserved'] }, item.quantity] }
          },
          { $inc: { reserved: item.quantity } },
          { new: true }
        );

        if (!result) {
          // Rollback các reservation đã reserve trước đó
          for (const prev of reservationItems) {
            if (prev.variant.toString() === item.variant.toString()) break;
            await variantModel.findByIdAndUpdate(prev.variant, {
              $inc: { reserved: -prev.quantity }
            });
          }
          reservation.status = 'cancelled';
          await reservation.save();
          return response.badRequest(res, 'Stock reservation failed - please try again');
        }
      }
    } catch (stockError) {
      reservation.status = 'cancelled';
      await reservation.save();
      return response.serverError(res, 'Stock reservation failed', stockError);
    }

    // ===== 7. CREATE ORDER =====
    const orderCode = generateOrderCode();
    const order = await orderModel.create({
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
        note: note
      },
      status: 'pending',
      totalAmount,
      coupon: appliedCouponId,
      discountAmount,
      reservation: reservation._id,
      idempotencyKey,
      note
    });

    // ===== 8. CREATE PAYMENT =====
    const payment = await paymentModel.create({
      user: userId,
      order: order._id,
      reservation: reservation._id,
      method: paymentMethod,
      amount: totalAmount,
      status: paymentMethod === 'cod' ? 'pending' : 'pending',
      idempotencyKey: `PAY-${idempotencyKey}`
    });

    // ===== 9. CREATE TRANSACTION =====
    const txnCode = generateTransactionCode();
    await transactionModel.create({
      payment: payment._id,
      order: order._id,
      user: userId,
      transactionCode: txnCode,
      type: 'payment',
      amount: totalAmount,
      status: paymentMethod === 'cod' ? 'pending' : 'pending',
      method: paymentMethod,
      description: `Payment for order ${orderCode}`,
      idempotencyKey: `TXN-${idempotencyKey}`
    });

    // ===== 10. SIMULATE ONLINE PAYMENT =====
    if (paymentMethod === 'online_simulated') {
      // Giả lập thanh toán online thành công
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.providerResponse = { simulatedGateway: 'success', approvalCode: crypto.randomBytes(6).toString('hex') };
      await payment.save();

      await transactionModel.findOneAndUpdate(
        { payment: payment._id },
        { status: 'success', processedAt: new Date() }
      );

      order.status = 'confirmed';
      await order.save();
    }

    // ===== 11. CONVERT RESERVATION =====
    reservation.status = 'converted';
    await reservation.save();

    // ===== 12. UPDATE SOLD COUNT (for online payment) =====
    if (paymentMethod === 'online_simulated') {
      for (const item of reservationItems) {
        await variantModel.findByIdAndUpdate(item.variant, {
          $inc: { reserved: -item.quantity, soldCount: item.quantity, stock: -item.quantity }
        });
      }
    }

    // ===== 13. CLEAR CART =====
    await cartItemModel.deleteMany({ cart: cart._id });

    // Link payment to order
    order.payment = payment._id;
    await order.save();

    await logAction(req, 'CREATE', 'order', order._id, `Created order ${orderCode} - ${totalAmount.toLocaleString()}đ`);

    return response.created(res, {
      order: await order.populate('payment'),
      transactionCode: txnCode
    }, 'Checkout successful! Order created.');
  } catch (error) {
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
