const ReturnRequest = require('../../schemas/returnRequests');

exports.create = async (req, res) => {
  try {
    const returnReq = new ReturnRequest({
      ...req.body,
      user: req.user._id
    });
    await returnReq.save();
    res.status(201).json({ success: true, data: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const filter = req.user.role === 'ADMIN' || req.user.role === 'STAFF' ? {} : { user: req.user._id };
    const requests = await ReturnRequest.find(filter).populate('order');
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const returnReq = await ReturnRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!returnReq) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
