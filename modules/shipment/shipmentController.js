const Shipment = require('../../schemas/shipments');

exports.getAll = async (req, res) => {
  try {
    const shipments = await Shipment.find().populate('order');
    res.status(200).json({ success: true, data: shipments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getByOrder = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ order: req.params.orderId });
    if (!shipment) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: shipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrUpdate = async (req, res) => {
  try {
    const { orderId } = req.params;
    let shipment = await Shipment.findOne({ order: orderId });
    if (shipment) {
      Object.assign(shipment, req.body);
      await shipment.save();
    } else {
      shipment = new Shipment({ ...req.body, order: orderId });
      await shipment.save();
    }
    res.status(200).json({ success: true, data: shipment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
