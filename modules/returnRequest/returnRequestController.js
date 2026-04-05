const Order = require('../../schemas/orders');
const ReturnRequest = Order.ReturnRequest;
const Refund = Order.Refund;
const response = require('../../middlewares/response');
const { notifyRoles, notifyUser } = require('../../utils/notificationHelper');

const getRoleName = (req) => req.user?.role?.name;

const populateRequestQuery = (query) =>
  query
    .populate('user', 'username fullName email phone')
    .populate({
      path: 'order',
      populate: [
        { path: 'user', select: 'username fullName email phone' },
        { path: 'payment', select: 'method status amount paidAt refundedAt' }
      ]
    })
    .populate('reviewedBy', 'username fullName email');

const attachRefundsToRequests = async (requestsOrRequest) => {
  const isArray = Array.isArray(requestsOrRequest);
  const requests = isArray
    ? requestsOrRequest
    : requestsOrRequest
      ? [requestsOrRequest]
      : [];

  if (!requests.length) {
    return isArray ? [] : null;
  }

  const refunds = await Refund.find({
    returnRequest: { $in: requests.map((request) => request._id) }
  }).sort({ createdAt: -1 });

  const refundMap = new Map(
    refunds.map((refund) => [
      (refund.returnRequest?._id || refund.returnRequest).toString(),
      refund.toObject ? refund.toObject() : refund
    ])
  );

  const attachRefund = (request) => {
    const plainRequest = request.toObject ? request.toObject() : request;
    return {
      ...plainRequest,
      refund: refundMap.get(plainRequest._id.toString()) || null
    };
  };

  return isArray ? requests.map(attachRefund) : attachRefund(requests[0]);
};

exports.create = async (req, res) => {
  try {
    const {
      order: orderId,
      reason,
      description = '',
      images = [],
      requestedAmount,
      refundMethod = 'bank_transfer',
      refundBankName = '',
      refundAccountName = '',
      refundAccountNumber = '',
      contactPhone = ''
    } = req.body;

    if (!orderId || !reason?.trim()) {
      return response.badRequest(res, 'Order and reason are required');
    }

    const order = await Order.findById(orderId)
      .populate('user', 'username fullName email phone')
      .populate('payment', 'method status amount paidAt refundedAt');

    if (!order) {
      return response.notFound(res, 'Order not found');
    }

    if (order.user?._id.toString() !== req.user._id.toString()) {
      return response.forbidden(res, 'You can only create return requests for your own orders');
    }

    if (order.status !== 'delivered' && order.status !== 'completed') {
      return response.badRequest(res, 'Only delivered or completed orders can be returned');
    }

    const existingRequest = await ReturnRequest.findOne({ order: orderId });
    if (existingRequest) {
      return response.conflict(res, 'A return request already exists for this order');
    }

    if (refundMethod === 'bank_transfer' && (!refundBankName || !refundAccountName || !refundAccountNumber)) {
      return response.badRequest(res, 'Bank name, account name and account number are required for bank transfer refunds');
    }

    const amount = Math.min(
      Math.max(Number(requestedAmount) || order.totalAmount || 0, 0),
      order.totalAmount || 0
    );

    const createdRequest = await ReturnRequest.create({
      order: orderId,
      user: req.user._id,
      reason: reason.trim(),
      description: description.trim(),
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      requestedAmount: amount,
      refundMethod,
      refundBankName: refundBankName.trim(),
      refundAccountName: refundAccountName.trim(),
      refundAccountNumber: refundAccountNumber.trim(),
      contactPhone: contactPhone.trim()
    });

    const populatedRequest = await populateRequestQuery(ReturnRequest.findById(createdRequest._id));

    await notifyRoles(['ADMIN', 'STAFF'], {
      title: 'Yeu cau hoan hang moi',
      message: `Don ${order.orderCode} vua tao yeu cau hoan hang. Vui long xem xet trong 1-3 ngay.`,
      type: 'order',
      relatedId: createdRequest._id
    });

    await notifyUser(req.user._id, {
      title: 'Da tiep nhan yeu cau hoan tien',
      message: `Yeu cau hoan hang cho don ${order.orderCode} da duoc ghi nhan. Admin se phan hoi trong 1-3 ngay.`,
      type: 'order',
      relatedId: createdRequest._id
    });

    return response.created(res, populatedRequest, 'Return request created successfully');
  } catch (error) {
    return response.badRequest(res, error.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const roleName = getRoleName(req);
    const filter = ['ADMIN', 'STAFF'].includes(roleName) ? {} : { user: req.user._id };
    const requests = await populateRequestQuery(
      ReturnRequest.find(filter).sort({ createdAt: -1 })
    );
    const enrichedRequests = await attachRefundsToRequests(requests);

    return response.success(res, enrichedRequests, 'Return requests retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get return requests', error);
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
      return response.forbidden(res, 'You can only view requests for your own orders');
    }

    const request = await populateRequestQuery(ReturnRequest.findOne({ order: req.params.orderId }));
    if (!request) {
      return response.notFound(res, 'Return request not found');
    }

    const enrichedRequest = await attachRefundsToRequests(request);
    return response.success(res, enrichedRequest, 'Return request retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get return request', error);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, adminNote = '' } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return response.badRequest(res, 'Status must be approved or rejected');
    }

    const returnReq = await populateRequestQuery(ReturnRequest.findById(req.params.id));
    if (!returnReq) {
      return response.notFound(res, 'Return request not found');
    }

    if (returnReq.status !== 'pending') {
      return response.badRequest(res, 'Only pending requests can be reviewed');
    }

    returnReq.status = status;
    returnReq.adminNote = adminNote.trim();
    returnReq.reviewedAt = new Date();
    returnReq.reviewedBy = req.user._id;
    await returnReq.save();

    let refund = await Refund.findOne({ returnRequest: returnReq._id });
    if (status === 'approved') {
      if (!refund) {
        refund = await Refund.create({
          returnRequest: returnReq._id,
          order: returnReq.order._id,
          user: returnReq.user._id,
          amount: returnReq.requestedAmount || returnReq.order.totalAmount || 0,
          method: returnReq.refundMethod,
          status: 'pending',
          adminNote: returnReq.adminNote
        });
      } else {
        refund.status = 'pending';
        refund.adminNote = returnReq.adminNote;
        refund.amount = returnReq.requestedAmount || refund.amount;
        await refund.save();
      }

      await notifyUser(returnReq.user._id, {
        title: 'Yeu cau hoan tien da duoc chap nhan',
        message: `Don ${returnReq.order.orderCode} da duoc chap nhan. Hoan tien se duoc xu ly trong 1-3 ngay.`,
        type: 'order',
        relatedId: returnReq._id
      });
    } else {
      await notifyUser(returnReq.user._id, {
        title: 'Yeu cau hoan tien da bi tu choi',
        message: returnReq.adminNote
          ? `Don ${returnReq.order.orderCode} bi tu choi: ${returnReq.adminNote}`
          : `Yeu cau hoan tien cho don ${returnReq.order.orderCode} da bi tu choi.`,
        type: 'order',
        relatedId: returnReq._id
      });
    }

    const updatedRequest = await populateRequestQuery(ReturnRequest.findById(returnReq._id));
    return response.success(res, { request: updatedRequest, refund }, `Return request ${status}`);
  } catch (error) {
    return response.badRequest(res, error.message);
  }
};
