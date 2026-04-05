const cartModel = require('../../schemas/carts');
const cartItemModel = require('../../schemas/cartItems');
const variantModel = require('../../schemas/productVariants');
const response = require('../../middlewares/response');

/**
 * GET /api/v1/carts/me
 * Lấy giỏ hàng hiện tại của user (tự tạo nếu chưa có)
 */
const getMyCart = async (req, res) => {
  try {
    let cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) {
      cart = await cartModel.create({ user: req.user._id });
    }

    const items = await cartItemModel.find({ cart: cart._id })
      .populate({
        path: 'product',
        select: 'name slug thumbnail salePrice originalPrice isActive isDeleted',
        populate: { path: 'brand', select: 'name' }
      })
      .populate({
        path: 'variant',
        select: 'size color sku price stock reserved isDeleted'
      });

    // Filter out invalid items
    const validItems = items.filter(item => 
      item.product && !item.product.isDeleted && item.product.isActive &&
      item.variant && !item.variant.isDeleted
    );

    // Tính tổng
    let totalAmount = 0;
    const cartItems = validItems.map(item => {
      const unitPrice = item.variant.price > 0 ? item.variant.price : item.product.salePrice;
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      return {
        _id: item._id,
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        available: item.variant.stock - item.variant.reserved
      };
    });

    return response.success(res, {
      _id: cart._id,
      items: cartItems,
      totalItems: cartItems.reduce((sum, i) => sum + i.quantity, 0),
      totalAmount
    }, 'Cart retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get cart', error);
  }
};

/**
 * POST /api/v1/carts/items
 * Thêm sản phẩm vào giỏ hàng
 * Body: { variantId, quantity? }
 */
const addItem = async (req, res) => {
  try {
    const { variantId, quantity = 1 } = req.body;
    if (!variantId) return response.badRequest(res, 'variantId is required');

    // Kiểm tra variant
    const variant = await variantModel.findOne({ _id: variantId, isDeleted: false })
      .populate('product', 'name isActive isDeleted');
    if (!variant) return response.notFound(res, 'Variant not found');
    if (!variant.product || variant.product.isDeleted || !variant.product.isActive) {
      return response.badRequest(res, 'Product is not available');
    }

    const available = variant.stock - variant.reserved;
    if (available < quantity) {
      return response.badRequest(res, `Not enough stock. Available: ${available}`);
    }

    // Lấy/tạo cart
    let cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) {
      cart = await cartModel.create({ user: req.user._id });
    }

    // Kiểm tra item đã tồn tại chưa
    let existingItem = await cartItemModel.findOne({ cart: cart._id, variant: variantId });
    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (available < newQty) {
        return response.badRequest(res, `Not enough stock. Available: ${available}, current in cart: ${existingItem.quantity}`);
      }
      existingItem.quantity = newQty;
      await existingItem.save();
    } else {
      existingItem = await cartItemModel.create({
        cart: cart._id,
        product: variant.product._id,
        variant: variantId,
        quantity
      });
    }

    return response.success(res, existingItem, 'Item added to cart');
  } catch (error) {
    return response.serverError(res, 'Failed to add item to cart', error);
  }
};

/**
 * PUT /api/v1/carts/items/:id
 * Cập nhật số lượng sản phẩm
 * Body: { quantity }
 */
const updateItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return response.badRequest(res, 'Quantity must be at least 1');

    const cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) return response.notFound(res, 'Cart not found');

    const item = await cartItemModel.findOne({ _id: req.params.id, cart: cart._id });
    if (!item) return response.notFound(res, 'Cart item not found');

    const variant = await variantModel.findById(item.variant);
    if (!variant || variant.isDeleted) return response.notFound(res, 'Variant no longer available');

    const available = variant.stock - variant.reserved;
    if (available < quantity) {
      return response.badRequest(res, `Not enough stock. Available: ${available}`);
    }

    item.quantity = quantity;
    await item.save();

    return response.success(res, item, 'Cart item updated');
  } catch (error) {
    return response.serverError(res, 'Failed to update cart item', error);
  }
};

/**
 * DELETE /api/v1/carts/items/:id
 * Xóa sản phẩm khỏi giỏ hàng
 */
const removeItem = async (req, res) => {
  try {
    const cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) return response.notFound(res, 'Cart not found');

    const item = await cartItemModel.findOneAndDelete({ _id: req.params.id, cart: cart._id });
    if (!item) return response.notFound(res, 'Cart item not found');

    return response.success(res, null, 'Item removed from cart');
  } catch (error) {
    return response.serverError(res, 'Failed to remove item', error);
  }
};

/**
 * DELETE /api/v1/carts/clear
 * Xóa toàn bộ giỏ hàng
 */
const clearCart = async (req, res) => {
  try {
    const cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) return response.notFound(res, 'Cart not found');

    await cartItemModel.deleteMany({ cart: cart._id });
    return response.success(res, null, 'Cart cleared');
  } catch (error) {
    return response.serverError(res, 'Failed to clear cart', error);
  }
};

module.exports = { getMyCart, addItem, updateItem, removeItem, clearCart };
