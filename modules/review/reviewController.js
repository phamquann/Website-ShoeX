const Review = require('../../schemas/reviews');
const Order = require('../../schemas/orders');

exports.getByProduct = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.id }).populate('user', 'name email avatar');
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id }).populate('product');
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createForProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user._id;

    // Check if user has bought this product
    // Assuming Order has items array which contains product
    const order = await Order.findOne({ 
      user: userId, 
      status: 'delivered',
      'items.product': productId 
    });

    if (!order) {
      return res.status(403).json({ success: false, message: 'You must buy this product to review it.' });
    }

    const review = new Review({
      user: userId,
      product: productId,
      rating: req.body.rating,
      comment: req.body.comment,
      images: req.body.images || [],
      order: order._id
    });

    await review.save();
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, 
      { rating: req.body.rating, comment: req.body.comment, images: req.body.images },
      { new: true }
    );
    if (!review) return res.status(404).json({ success: false, message: 'Review not found or unauthorized' });
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    // Both admin or user who created the review can delete
    const condition = req.user.role === 'ADMIN' ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
    const review = await Review.findOneAndDelete(condition);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found or unauthorized' });
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
