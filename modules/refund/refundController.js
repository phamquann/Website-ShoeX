const crypto = require('crypto');
const Order = require('../../schemas/orders');
const Refund = Order.Refund;
const ReturnRequest = Order.ReturnRequest;
const Payment = Order.Payment;
const Transaction = Order.Transaction;
const response = require('../../middlewares/response');
const { notifyUser } = require('../../utils/notificationHelper');

const getRoleName = (req) => req.user?.role?.name;

const populateRefundQuery = (query) =>
  query
    .populate('user', 'username fullName email phone')
    .populate({
      path: 'order',
      populate: [
        { path: 'user', select: 'username fullName email phone' },
        { path: 'payment', select: 'method status amount paidAt refundedAt' }
      ]
    })
    .populate('returnRequest');

const generateRefundTransactionCode = () =>
  `RF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

exports.create = async (req, res) => {
  try {
    const refund = await Refund.create(req.body);
    const populatedRefund = await populateRefundQuery(Refund.findById(refund._id));
    return response.created(res, populatedRefund, 'Refund created successfully');
  } catch (error) {
    return response.badRequest(res, error.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const roleName = getRoleName(req);
    const filter = ['ADMIN', 'STAFF'].includes(roleName) ? {} : { user: req.user._id };
    const refunds = await populateRefundQuery(
      Refund.find(filter).sort({ createdAt: -1 })
    );

    return response.success(res, refunds, 'Refunds retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get refunds', error);
  }
};

exports.getByOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('user', 'username fullName email phone');
    if (!order) {
      return response.notFound(res, 'Order not found');
    }

    const roleName = getRoleName(req);
    const isPrivileged = ['ADMIN', 'STAFF'].includes(roleName);
    if (!isPrivileged && order.user?._id.toString() !== req.user._id.toString()) {
      return response.forbidden(res, 'You can only view refunds for your own orders');
    }

    const refund = await populateRefundQuery(Refund.findOne({ order: req.params.orderId }));
    if (!refund) {
      return response.notFound(res, 'Refund not found');
    }

    return response.success(res, refund, 'Refund retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get refund', error);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, transactionId = '', adminNote = '' } = req.body;
    if (!['processing', 'completed', 'failed'].includes(status)) {
      return response.badRequest(res, 'Status must be processing, completed or failed');
    }

    const refund = await populateRefundQuery(Refund.findById(req.params.id));
    if (!refund) {
      return response.notFound(res, 'Refund not found');
    }

    refund.status = status;
    refund.adminNote = adminNote.trim();
    if (transactionId) {
      refund.transactionId = transactionId.trim();
    }
    if (status === 'completed') {
      refund.processedAt = new Date();
    }
    await refund.save();

    const payment = await Payment.findOne({ order: refund.order._id });
    const returnRequest = await ReturnRequest.findById(refund.returnRequest?._id || refund.returnRequest);

    if (status === 'completed') {
      if (payment) {
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        await payment.save();

        const existingTransaction = await Transaction.findOne({
          order: refund.order._id,
          type: 'refund'
        });

        if (!existingTransaction) {
          await Transaction.create({
            payment: payment._id,
            order: refund.order._id,
            user: refund.user._id,
            transactionCode: refund.transactionId || generateRefundTransactionCode(),
            type: 'refund',
            amount: refund.amount,
            status: 'success',
            method: payment.method,
            description: `Refund completed for order ${refund.order.orderCode}`,
            idempotencyKey: `REFUND-${refund._id}`,
            processedAt: new Date()
          });
        }
      }

      if (returnRequest) {
        returnRequest.status = 'completed';
        if (adminNote.trim()) {
          returnRequest.adminNote = adminNote.trim();
        }
        await returnRequest.save();
      }

      await notifyUser(refund.user._id, {
        title: 'Hoan tien da hoan tat',
        message: `Khoan hoan tien cho don ${refund.order.orderCode} da duoc hoan tat.`,
        type: 'order',
        relatedId: refund._id
      });
    } else if (status === 'processing') {
      await notifyUser(refund.user._id, {
        title: 'Hoan tien dang duoc xu ly',
        message: `Yeu cau hoan tien cho don ${refund.order.orderCode} dang duoc xu ly trong 1-3 ngay.`,
        type: 'order',
        relatedId: refund._id
      });
    } else if (status === 'failed') {
      await notifyUser(refund.user._id, {
        title: 'Hoan tien gap van de',
        message: adminNote.trim()
          ? `Khoan hoan tien cho don ${refund.order.orderCode} gap van de: ${adminNote.trim()}`
          : `Khoan hoan tien cho don ${refund.order.orderCode} tam thoi that bai. Vui long lien he ho tro.`,
        type: 'order',
        relatedId: refund._id
      });
    }

    const updatedRefund = await populateRefundQuery(Refund.findById(refund._id));
    return response.success(res, updatedRefund, `Refund status updated to ${status}`);
  } catch (error) {
    return response.badRequest(res, error.message);
  }
};
