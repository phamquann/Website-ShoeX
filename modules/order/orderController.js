const orderModel = require('../../schemas/orders');
const paymentModel = require('../../schemas/payments');
const transactionModel = require('../../schemas/transactions');
const variantModel = require('../../schemas/productVariants');
const reservationModel = require('../../schemas/reservations');
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');

/**
 * GET /api/v1/orders/me
 * Xem lịch sử đơn hàng của user
 */
const getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      orderModel.find(filter)
        .populate('payment', 'method status amount paidAt')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit)),
      orderModel.countDocuments(filter)
    ]);

    return response.success(res, orders, 'Orders retrieved', 200, {
      page: parseInt(page), limit: parseInt(limit), total,
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    return response.serverError(res, 'Failed to get orders', error);
  }
};

/**
 * GET /api/v1/orders/:id
 * Xem chi tiết đơn hàng
 */
const getOrderById = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id)
      .populate('payment')
      .populate('user', 'username fullName email phone');

    if (!order) return response.notFound(res, 'Order not found');

    // User chỉ xem order của mình, ADMIN/STAFF xem tất cả
    const userRole = req.user.role?.name;
    if (userRole !== 'ADMIN' && userRole !== 'STAFF' && order.user._id.toString() !== req.user._id.toString()) {
      return response.forbidden(res, 'You can only view your own orders');
    }

    // Lấy transactions
    const transactions = await transactionModel.find({ order: order._id }).sort({ createdAt: -1 });

    return response.success(res, { order, transactions });
  } catch (error) {
    return response.serverError(res, 'Failed to get order', error);
  }
};

/**
 * GET /api/v1/orders
 * ADMIN/STAFF - Xem tất cả đơn hàng
 */
const getAllOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.orderCode = new RegExp(search, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      orderModel.find(filter)
        .populate('user', 'username fullName email')
        .populate('payment', 'method status amount')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit)),
      orderModel.countDocuments(filter)
    ]);

    return response.success(res, orders, 'All orders retrieved', 200, {
      page: parseInt(page), limit: parseInt(limit), total,
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    return response.serverError(res, 'Failed to get orders', error);
  }
};

/**
 * PATCH /api/v1/orders/:id/status
 * ADMIN/STAFF - Cập nhật trạng thái đơn hàng
 * Body: { status, cancelReason? }
 */
const updateStatus = async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return response.badRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await orderModel.findById(req.params.id);
    if (!order) return response.notFound(res, 'Order not found');

    // Validate status transitions
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipping', 'cancelled'],
      shipping: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!transitions[order.status].includes(status)) {
      return response.badRequest(res, `Cannot change status from '${order.status}' to '${status}'`);
    }

    order.status = status;

    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancelReason = cancelReason || '';

      // Release inventory
      const reservation = await reservationModel.findById(order.reservation);
      if (reservation && reservation.status !== 'cancelled') {
        for (const item of reservation.items) {
          await variantModel.findByIdAndUpdate(item.variant, {
            $inc: { reserved: -item.quantity }
          });
        }
        reservation.status = 'cancelled';
        await reservation.save();
      }

      // Refund payment if paid
      const payment = await paymentModel.findOne({ order: order._id });
      if (payment && payment.status === 'paid') {
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        await payment.save();

        // Restore stock if already deducted
        if (reservation) {
          for (const item of reservation.items) {
            await variantModel.findByIdAndUpdate(item.variant, {
              $inc: { soldCount: -item.quantity, stock: item.quantity }
            });
          }
        }
      }
    }

    if (status === 'confirmed') {
      // COD: confirm the order
      const payment = await paymentModel.findOne({ order: order._id });
      if (payment && payment.method === 'cod') {
        // COD stays pending until delivery
      }
    }

    if (status === 'delivered') {
      // COD: mark as paid on delivery
      const payment = await paymentModel.findOne({ order: order._id });
      if (payment && payment.method === 'cod' && payment.status !== 'paid') {
        payment.status = 'paid';
        payment.paidAt = new Date();
        await payment.save();

        await transactionModel.findOneAndUpdate(
          { payment: payment._id },
          { status: 'success', processedAt: new Date() }
        );

        // Trừ kho thật cho COD delivered
        const reservation = await reservationModel.findById(order.reservation);
        if (reservation) {
          for (const item of reservation.items) {
            await variantModel.findByIdAndUpdate(item.variant, {
              $inc: { reserved: -item.quantity, soldCount: item.quantity, stock: -item.quantity }
            });
          }
        }
      }
    }

    await order.save();
    await logAction(req, 'UPDATE', 'order', order._id, `Changed order ${order.orderCode} status to ${status}`);

    return response.success(res, order, `Order status updated to ${status}`);
  } catch (error) {
    return response.serverError(res, 'Failed to update order status', error);
  }
};

module.exports = { getMyOrders, getOrderById, getAllOrders, updateStatus };
