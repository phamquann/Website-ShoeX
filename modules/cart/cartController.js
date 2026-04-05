const cartModel = require('../../schemas/carts');
const productModel = require('../../schemas/products');
const variantModel = productModel.ProductVariant;
const response = require('../../middlewares/response');

const getOrCreateCart = async (userId) => {
  let cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    cart = await cartModel.create({ user: userId });
  }
  return cart;
};

const findCartItemByInput = (cart, payload = {}) => {
  const { itemId, variantId } = payload;

  if (itemId) {
    return cart.items.find((item) => item._id.toString() === itemId.toString()) || null;
  }

  if (variantId) {
    return cart.items.find((item) => item.variant.toString() === variantId.toString()) || null;
  }

  return null;
};

const buildCartPayload = async (cart) => {
  await cart.populate([
    {
      path: 'items.product',
      select: 'name slug thumbnail salePrice originalPrice isActive isDeleted',
      populate: { path: 'brand', select: 'name' }
    },
    {
      path: 'items.variant',
      select: 'size color sku price stock reserved isDeleted'
    }
  ]);

  const validItems = (cart.items || []).filter((item) =>
    item.product && !item.product.isDeleted && item.product.isActive &&
    item.variant && !item.variant.isDeleted
  );

  let totalAmount = 0;
  const items = validItems.map((item) => {
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

  return {
    _id: cart._id,
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount
  };
};

/**
 * GET /api/v1/carts/me
 * Lấy giỏ hàng hiện tại của user (tự tạo nếu chưa có)
 */
const getMyCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const payload = await buildCartPayload(cart);

    return response.success(res, payload, 'Cart retrieved');
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
    const cart = await getOrCreateCart(req.user._id);

    // Kiểm tra item đã tồn tại chưa
    let existingItem = cart.items.find((item) => item.variant.toString() === variantId.toString()) || null;
    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (available < newQty) {
        return response.badRequest(res, `Not enough stock. Available: ${available}, current in cart: ${existingItem.quantity}`);
      }
      existingItem.quantity = newQty;
    } else {
      cart.items.push({
        product: variant.product._id,
        variant: variantId,
        quantity
      });
      existingItem = cart.items[cart.items.length - 1];
    }

    await cart.save();

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

    const cart = await getOrCreateCart(req.user._id);
    if (!cart) return response.notFound(res, 'Cart not found');

    const item = cart.items.find((cartItem) => cartItem._id.toString() === req.params.id) || null;
    if (!item) return response.notFound(res, 'Cart item not found');

    const variant = await variantModel.findById(item.variant);
    if (!variant || variant.isDeleted) return response.notFound(res, 'Variant no longer available');

    const available = variant.stock - variant.reserved;
    if (available < quantity) {
      return response.badRequest(res, `Not enough stock. Available: ${available}`);
    }

    item.quantity = quantity;
    await cart.save();

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
    const cart = await getOrCreateCart(req.user._id);
    if (!cart) return response.notFound(res, 'Cart not found');

    const prevLength = cart.items.length;
    cart.items = cart.items.filter((item) => item._id.toString() !== req.params.id);
    if (cart.items.length === prevLength) return response.notFound(res, 'Cart item not found');

    await cart.save();

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
    const cart = await getOrCreateCart(req.user._id);
    if (!cart) return response.notFound(res, 'Cart not found');

    cart.items = [];
    await cart.save();
    return response.success(res, null, 'Cart cleared');
  } catch (error) {
    return response.serverError(res, 'Failed to clear cart', error);
  }
};

/**
 * POST /api/v1/carts/decrease
 * Body: { itemId? | variantId? }
 * Giảm 1 số lượng item, nếu còn 1 thì xóa khỏi giỏ
 */
const decreaseItem = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const item = findCartItemByInput(cart, req.body);

    if (!item) {
      return response.notFound(res, 'Cart item not found');
    }

    if (item.quantity <= 1) {
      cart.items = cart.items.filter((cartItem) => cartItem._id.toString() !== item._id.toString());
      await cart.save();
      return response.success(res, null, 'Item removed from cart');
    }

    item.quantity -= 1;
    await cart.save();

    return response.success(res, item, 'Cart item decreased');
  } catch (error) {
    return response.serverError(res, 'Failed to decrease cart item', error);
  }
};

/**
 * POST /api/v1/carts/remove
 * Body: { itemId? | variantId? }
 */
const removeByBody = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const item = findCartItemByInput(cart, req.body);

    if (!item) {
      return response.notFound(res, 'Cart item not found');
    }

    cart.items = cart.items.filter((cartItem) => cartItem._id.toString() !== item._id.toString());
    await cart.save();

    return response.success(res, null, 'Item removed from cart');
  } catch (error) {
    return response.serverError(res, 'Failed to remove cart item', error);
  }
};

module.exports = {
  getMyCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  decreaseItem,
  removeByBody
};
