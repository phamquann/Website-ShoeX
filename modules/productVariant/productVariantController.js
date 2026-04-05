const productModel = require('../../schemas/products');
const variantModel = productModel.ProductVariant;
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');

/**
 * GET /api/v1/product-variants?product=xxx
 */
const getByProduct = async (req, res) => {
  try {
    const { product } = req.query;
    if (!product) return response.badRequest(res, 'Product ID is required as query param');

    const variants = await variantModel.find({ product, isDeleted: false })
      .populate('product', 'name sku salePrice')
      .sort({ 'color.name': 1, size: 1 });

    return response.success(res, variants, 'Variants retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get variants', error);
  }
};

/**
 * GET /api/v1/product-variants/:id
 */
const getById = async (req, res) => {
  try {
    const variant = await variantModel.findOne({ _id: req.params.id, isDeleted: false })
      .populate('product', 'name sku salePrice');

    if (!variant) return response.notFound(res, 'Variant not found');
    return response.success(res, variant);
  } catch (error) {
    return response.serverError(res, 'Failed to get variant', error);
  }
};

/**
 * POST /api/v1/product-variants
 * Create variant (size/color embedded, inventory included)
 */
const create = async (req, res) => {
  try {
    const { product, size, colorName, colorHexCode, sku, price, stock } = req.body;

    // Check product exists
    const productExists = await productModel.findOne({ _id: product, isDeleted: false });
    if (!productExists) return response.notFound(res, 'Product not found');

    // Check duplicate variant (same product + size + color)
    const existingVariant = await variantModel.findOne({
      product, size, 'color.name': colorName, isDeleted: false
    });
    if (existingVariant) return response.conflict(res, 'Variant with this size and color already exists');

    // Check duplicate SKU
    const existingSku = await variantModel.findOne({ sku: sku.toUpperCase() });
    if (existingSku) return response.conflict(res, 'Variant SKU already exists');

    const variant = await variantModel.create({
      product,
      size,
      color: { name: colorName, hexCode: colorHexCode || '#000000' },
      sku: sku.toUpperCase(),
      price: price || 0,
      stock: stock || 0,
      reserved: 0,
      soldCount: 0
    });

    await logAction(req, 'CREATE', 'productVariant', variant._id, `Created variant: ${sku}`);
    return response.created(res, variant, 'Variant created successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to create variant', error);
  }
};

/**
 * PUT /api/v1/product-variants/:id
 */
const update = async (req, res) => {
  try {
    const variant = await variantModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!variant) return response.notFound(res, 'Variant not found');

    const { size, colorName, colorHexCode, sku, price, stock } = req.body;

    if (sku && sku.toUpperCase() !== variant.sku) {
      const existingSku = await variantModel.findOne({ sku: sku.toUpperCase(), _id: { $ne: req.params.id } });
      if (existingSku) return response.conflict(res, 'Variant SKU already exists');
      variant.sku = sku.toUpperCase();
    }

    if (size) variant.size = size;
    if (colorName) variant.color.name = colorName;
    if (colorHexCode) variant.color.hexCode = colorHexCode;
    if (price !== undefined) variant.price = price;
    if (stock !== undefined) variant.stock = stock;

    await variant.save();
    await logAction(req, 'UPDATE', 'productVariant', variant._id, `Updated variant: ${variant.sku}`);
    return response.success(res, variant, 'Variant updated successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to update variant', error);
  }
};

/**
 * DELETE /api/v1/product-variants/:id
 */
const remove = async (req, res) => {
  try {
    const variant = await variantModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!variant) return response.notFound(res, 'Variant not found');

    variant.isDeleted = true;
    await variant.save();
    await logAction(req, 'DELETE', 'productVariant', variant._id, `Deleted variant: ${variant.sku}`);
    return response.success(res, null, 'Variant deleted successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to delete variant', error);
  }
};

// ===================================================================
// INVENTORY OPERATIONS (gộp từ Inventory module)
// ===================================================================

/**
 * PUT /api/v1/product-variants/:id/restock
 * Nhập hàng (+stock)
 */
const restock = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) return response.badRequest(res, 'Quantity must be positive');

    const variant = await variantModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!variant) return response.notFound(res, 'Variant not found');

    variant.stock += quantity;
    await variant.save();

    await logAction(req, 'UPDATE', 'inventory', variant._id, `Restocked +${quantity}, new stock: ${variant.stock}`);
    return response.success(res, variant, `Restocked successfully. New stock: ${variant.stock}`);
  } catch (error) {
    return response.serverError(res, 'Failed to restock', error);
  }
};

/**
 * PUT /api/v1/product-variants/:id/reserve
 * Đặt trước khi checkout
 */
const reserve = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) return response.badRequest(res, 'Quantity must be positive');

    const variant = await variantModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!variant) return response.notFound(res, 'Variant not found');

    const available = variant.stock - variant.reserved;
    if (quantity > available) return response.badRequest(res, `Not enough stock. Available: ${available}`);

    variant.reserved += quantity;
    await variant.save();

    await logAction(req, 'UPDATE', 'inventory', variant._id, `Reserved ${quantity}`);
    return response.success(res, variant, `Reserved ${quantity} units`);
  } catch (error) {
    return response.serverError(res, 'Failed to reserve', error);
  }
};

/**
 * PUT /api/v1/product-variants/:id/release
 * Hủy đặt trước
 */
const release = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) return response.badRequest(res, 'Quantity must be positive');

    const variant = await variantModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!variant) return response.notFound(res, 'Variant not found');

    if (quantity > variant.reserved) return response.badRequest(res, `Cannot release more than reserved: ${variant.reserved}`);

    variant.reserved -= quantity;
    await variant.save();

    await logAction(req, 'UPDATE', 'inventory', variant._id, `Released ${quantity}`);
    return response.success(res, variant, `Released ${quantity} reserved units`);
  } catch (error) {
    return response.serverError(res, 'Failed to release', error);
  }
};

/**
 * PUT /api/v1/product-variants/:id/sold
 * Xác nhận bán (giảm stock + reserved, tăng soldCount)
 */
const sold = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) return response.badRequest(res, 'Quantity must be positive');

    const variant = await variantModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!variant) return response.notFound(res, 'Variant not found');

    if (quantity > variant.reserved) return response.badRequest(res, `Cannot sell more than reserved: ${variant.reserved}`);

    variant.stock -= quantity;
    variant.reserved -= quantity;
    variant.soldCount += quantity;
    await variant.save();

    await logAction(req, 'UPDATE', 'inventory', variant._id, `Sold ${quantity}, stock: ${variant.stock}`);
    return response.success(res, variant, `Sold ${quantity} units`);
  } catch (error) {
    return response.serverError(res, 'Failed to update sold', error);
  }
};

/**
 * GET /api/v1/product-variants/:id/check-stock
 * Kiểm tra tồn kho
 */
const checkStock = async (req, res) => {
  try {
    const variant = await variantModel.findOne({ _id: req.params.id, isDeleted: false })
      .populate('product', 'name sku');

    if (!variant) return response.notFound(res, 'Variant not found');

    const available = variant.stock - variant.reserved;
    return response.success(res, {
      variant: {
        _id: variant._id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        product: variant.product
      },
      stock: variant.stock,
      reserved: variant.reserved,
      available,
      soldCount: variant.soldCount,
      inStock: available > 0
    }, 'Stock check completed');
  } catch (error) {
    return response.serverError(res, 'Failed to check stock', error);
  }
};

module.exports = {
  getByProduct, getById, create, update, remove,
  restock, reserve, release, sold, checkStock
};
