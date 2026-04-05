const Order = require('../../schemas/orders');
const Shipment = Order.Shipment;

const PRIVILEGED_ROLES = ['ADMIN', 'STAFF'];

const canAccessOrderShipment = (orderUserId, user) => {
  if (PRIVILEGED_ROLES.includes(user?.role?.name)) {
    return true;
  }

  if (!orderUserId || !user?._id) {
    return false;
  }

  return orderUserId.toString() === user._id.toString();
};

const deriveShipmentStatusFromOrder = (orderStatus) => {
  switch (orderStatus) {
    case 'shipping':
      return 'delivering';
    case 'delivered':
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'failed';
    default:
      return 'preparing';
  }
};

const syncOrderStatusFromShipment = (order, shipmentStatus) => {
  switch (shipmentStatus) {
    case 'preparing':
      if (order.status === 'pending') {
        order.status = 'confirmed';
      }
      break;
    case 'picked_up':
    case 'delivering':
      if (order.status !== 'delivered' && order.status !== 'completed') {
        order.status = 'shipping';
      }
      break;
    case 'delivered':
      if (order.status !== 'completed') {
        order.status = 'delivered';
      }
      break;
    default:
      break;
  }
};

exports.getAll = async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: 'cancelled' } })
      .populate('user', 'username fullName email phone')
      .sort({ createdAt: -1 })
      .lean();

    const shipments = await Shipment.find({
      order: { $in: orders.map(order => order._id) }
    })
      .populate({
        path: 'order',
        populate: {
          path: 'user',
          select: 'username fullName email phone'
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    const shipmentByOrderId = new Map(
      shipments
        .filter(shipment => shipment.order?._id)
        .map(shipment => [shipment.order._id.toString(), shipment])
    );

    const data = orders.map(order => {
      const existingShipment = shipmentByOrderId.get(order._id.toString());
      if (existingShipment) {
        return existingShipment;
      }

      return {
        _id: `virtual-${order._id}`,
        order,
        shippingProvider: '',
        trackingNumber: '',
        status: deriveShipmentStatusFromOrder(order.status),
        estimatedDeliveryDate: null,
        hasShipment: false,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getByOrder = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ order: req.params.orderId }).populate({
      path: 'order',
      populate: {
        path: 'user',
        select: 'username fullName email phone'
      }
    });

    if (shipment) {
      const orderUserId = shipment.order?.user?._id;
      if (!canAccessOrderShipment(orderUserId, req.user)) {
        return res.status(403).json({ success: false, message: 'You can only view shipment of your own orders' });
      }

      return res.status(200).json({ success: true, data: shipment });
    }

    const order = await Order.findById(req.params.orderId)
      .populate('user', 'username fullName email phone')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!canAccessOrderShipment(order.user?._id, req.user)) {
      return res.status(403).json({ success: false, message: 'You can only view shipment of your own orders' });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: `virtual-${order._id}`,
        order,
        shippingProvider: '',
        trackingNumber: '',
        status: deriveShipmentStatusFromOrder(order.status),
        estimatedDeliveryDate: null,
        hasShipment: false,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrUpdate = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot create shipment for a cancelled order' });
    }

    const payload = {
      shippingProvider: req.body.shippingProvider?.toString().trim(),
      trackingNumber: req.body.trackingNumber?.toString().trim(),
      status: req.body.status || 'preparing'
    };

    if (!payload.shippingProvider) {
      return res.status(400).json({ success: false, message: 'Shipping provider is required' });
    }
    if (!payload.trackingNumber) {
      return res.status(400).json({ success: false, message: 'Tracking number is required' });
    }
    if (req.body.estimatedDeliveryDate) {
      payload.estimatedDeliveryDate = req.body.estimatedDeliveryDate;
    }

    let shipment = await Shipment.findOne({ order: orderId });
    if (shipment) {
      Object.assign(shipment, payload);
      await shipment.save();
    } else {
      shipment = new Shipment({ ...payload, order: orderId });
      await shipment.save();
    }

    syncOrderStatusFromShipment(order, shipment.status);
    await order.save();

    const populatedShipment = await Shipment.findById(shipment._id).populate({
      path: 'order',
      populate: {
        path: 'user',
        select: 'username fullName email phone'
      }
    });

    res.status(200).json({ success: true, data: populatedShipment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
