const User = require('../../schemas/users');

const getWishlistResponse = async (userId) => {
  const user = await User.findById(userId)
    .select('wishlist')
    .populate('wishlist');

  return {
    _id: user?._id,
    user: user?._id,
    products: user?.wishlist || []
  };
};

exports.getMine = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wishlist');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const wishlist = await getWishlistResponse(req.user._id);
    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.add = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: productId } },
      { new: true }
    );

    const wishlist = await getWishlistResponse(req.user._id);
    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const productId = req.params.id; // product id to remove

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: productId } },
      { new: true }
    );

    const wishlist = await getWishlistResponse(req.user._id);
    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
