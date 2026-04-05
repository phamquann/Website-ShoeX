const Refund = require('../../schemas/refunds');

exports.create = async (req, res) => {
  try {
    const refund = new Refund(req.body);
    await refund.save();
    res.status(201).json({ success: true, data: refund });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const refunds = await Refund.find().populate('order');
    res.status(200).json({ success: true, data: refunds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getByOrder = async (req, res) => {
  try {
    const refund = await Refund.findOne({ order: req.params.orderId });
    if (!refund) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: refund });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const refund = await Refund.findByIdAndUpdate(req.params.id, { status: req.body.status, transactionId: req.body.transactionId }, { new: true });
    if (!refund) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: refund });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
