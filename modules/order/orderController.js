const orderModel = require('../../schemas/orders');
const paymentModel = orderModel.Payment;
const transactionModel = orderModel.Transaction;
const shipmentModel = orderModel.Shipment;
const returnRequestModel = orderModel.ReturnRequest;
const refundModel = orderModel.Refund;
const reservationModel = orderModel.Reservation;
const productModel = require('../../schemas/products');
const variantModel = productModel.ProductVariant;
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');

const buildVirtualShipment = (order) => {
  let status = 'preparing';
  if (order.status === 'shipping') status = 'delivering';
  if (order.status === 'delivered' || order.status === 'completed') status = 'delivered';
  if (order.status === 'cancelled') status = 'failed';

  return {
    _id: `virtual-${order._id}`,
    order: order._id,
    shippingProvider: '',
    trackingNumber: '',
    status,
    estimatedDeliveryDate: null,
    hasShipment: false,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
};

const FULFILLED_STATUSES = ['delivered', 'completed'];

const buildMonthSeries = (monthlyRows, monthCount) => {
  const seriesMap = new Map();
  monthlyRows.forEach((row) => {
    const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
    seriesMap.set(key, row);
  });

  const now = new Date();
  const result = [];
  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const pointDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = pointDate.getFullYear();
    const month = pointDate.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const matched = seriesMap.get(key);

    result.push({
      key,
      label: `${String(month).padStart(2, '0')}/${year}`,
      year,
      month,
      revenue: matched ? matched.revenue : 0,
      orders: matched ? matched.orders : 0,
      itemsSold: matched ? matched.itemsSold : 0
    });
  }

  return result;
};

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
    const [transactions, shipment, returnRequest, refund] = await Promise.all([
      transactionModel.find({ order: order._id }).sort({ createdAt: -1 }),
      shipmentModel.findOne({ order: order._id }),
      returnRequestModel.findOne({ order: order._id }).populate('reviewedBy', 'username fullName email'),
      refundModel.findOne({ order: order._id })
    ]);

    return response.success(res, {
      order,
      transactions,
      shipment: shipment || buildVirtualShipment(order),
      returnRequest,
      refund
    });
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
        .populate('user', 'username fullName email phone')
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
      completed: [],
      cancelled: []
    };

    if (!transitions[order.status] || !transitions[order.status].includes(status)) {
      return response.badRequest(res, `Cannot change status from '${order.status}' to '${status}'`);
    }

    order.status = status;

    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.completedAt = null;
      order.isReceivedConfirmed = false;
      order.receivedConfirmedAt = null;
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
      order.completedAt = null;
      order.isReceivedConfirmed = false;
      order.receivedConfirmedAt = null;

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

/**
 * PATCH /api/v1/orders/:id/complete
 * USER - Xac nhan da nhan hang (hoan thanh don)
 */
const completeMyOrder = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return response.notFound(res, 'Order not found');

    if (order.user.toString() !== req.user._id.toString()) {
      return response.forbidden(res, 'You can only complete your own orders');
    }

    if (order.status !== 'delivered' && order.status !== 'completed') {
      return response.badRequest(res, 'Only delivered orders can be confirmed as received');
    }

    if (order.status === 'completed' && order.isReceivedConfirmed) {
      return response.success(res, order, 'Order has already been confirmed as received');
    }

    order.status = 'completed';
    order.completedAt = order.completedAt || new Date();
    order.isReceivedConfirmed = true;
    order.receivedConfirmedAt = new Date();
    await order.save();

    await logAction(req, 'COMPLETE', 'order', order._id, `User confirmed received order ${order.orderCode}`);
    return response.success(res, order, 'Order received confirmation saved successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to confirm order receipt', error);
  }
};

/**
 * GET /api/v1/orders/dashboard/overview
 * ADMIN/STAFF - Thong ke dashboard ban hang
 */
const getDashboardOverview = async (req, res) => {
  try {
    const queryMonths = Number.parseInt(req.query.months, 10);
    const months = Number.isInteger(queryMonths)
      ? Math.min(Math.max(queryMonths, 3), 24)
      : 6;

    const startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    startDate.setMonth(startDate.getMonth() - (months - 1));

    const [summaryFacet, topProducts, monthlyRows] = await Promise.all([
      orderModel.aggregate([
        {
          $facet: {
            revenueSummary: [
              { $match: { status: { $in: FULFILLED_STATUSES } } },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: '$totalAmount' },
                  fulfilledOrders: { $sum: 1 }
                }
              }
            ],
            itemSummary: [
              { $match: { status: { $in: FULFILLED_STATUSES } } },
              {
                $addFields: {
                  orderItemsSold: { $sum: '$items.quantity' }
                }
              },
              {
                $group: {
                  _id: null,
                  totalItemsSold: { $sum: '$orderItemsSold' }
                }
              }
            ],
            statusBreakdown: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              },
              { $project: { _id: 0, status: '$_id', count: 1 } },
              { $sort: { count: -1 } }
            ]
          }
        }
      ]),
      orderModel.aggregate([
        { $match: { status: { $in: FULFILLED_STATUSES } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.productName' },
            thumbnail: { $first: '$items.thumbnail' },
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' }
          }
        },
        { $sort: { quantitySold: -1, revenue: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            productName: 1,
            thumbnail: 1,
            quantitySold: 1,
            revenue: 1
          }
        }
      ]),
      orderModel.aggregate([
        {
          $match: {
            status: { $in: FULFILLED_STATUSES },
            createdAt: { $gte: startDate }
          }
        },
        {
          $addFields: {
            orderItemsSold: { $sum: '$items.quantity' }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            itemsSold: { $sum: '$orderItemsSold' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            revenue: 1,
            orders: 1,
            itemsSold: 1
          }
        }
      ])
    ]);

    const summaryData = summaryFacet?.[0] || {};
    const revenueSummary = summaryData.revenueSummary?.[0] || {};
    const itemSummary = summaryData.itemSummary?.[0] || {};
    const statusBreakdown = summaryData.statusBreakdown || [];

    const totalRevenue = Number(revenueSummary.totalRevenue || 0);
    const fulfilledOrders = Number(revenueSummary.fulfilledOrders || 0);
    const totalItemsSold = Number(itemSummary.totalItemsSold || 0);
    const averageOrderValue = fulfilledOrders > 0
      ? Number((totalRevenue / fulfilledOrders).toFixed(2))
      : 0;

    const monthlyRevenue = buildMonthSeries(monthlyRows, months);

    return response.success(res, {
      summary: {
        totalRevenue,
        totalItemsSold,
        fulfilledOrders,
        averageOrderValue
      },
      monthlyRevenue,
      topProducts,
      statusBreakdown
    }, 'Dashboard overview retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get dashboard overview', error);
  }
};

module.exports = { getMyOrders, getOrderById, getAllOrders, updateStatus, completeMyOrder, getDashboardOverview };
