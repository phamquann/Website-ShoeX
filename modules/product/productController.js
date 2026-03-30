const productModel = require('../../schemas/products');
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const config = require('../../configs');
const slugify = require('slugify');

/**
 * GET /api/v1/products
 * Public - List products with search, filter, sort, pagination
 */
const getAll = async (req, res) => {
  try {
    const {
      search, brand, category,
      minPrice, maxPrice,
      sort = '-createdAt',
      page = 1, limit = 20
    } = req.query;

    const filter = { isDeleted: false, isActive: true };

    if (search) filter.name = new RegExp(search, 'i');
    if (brand) filter.brand = brand;
    if (category) filter.category = category;

    if (minPrice || maxPrice) {
      filter.salePrice = {};
      if (minPrice) filter.salePrice.$gte = Number(minPrice);
      if (maxPrice) filter.salePrice.$lte = Number(maxPrice);
    }

    let sortOption = {};
    switch (sort) {
      case 'price_asc': sortOption = { salePrice: 1 }; break;
      case 'price_desc': sortOption = { salePrice: -1 }; break;
      case 'newest': sortOption = { createdAt: -1 }; break;
      case 'oldest': sortOption = { createdAt: 1 }; break;
      case 'name_asc': sortOption = { name: 1 }; break;
      case 'name_desc': sortOption = { name: -1 }; break;
      default: sortOption = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      productModel.find(filter)
        .populate('brand', 'name slug logo')
        .populate('category', 'name slug')
        .sort(sortOption).skip(skip).limit(parseInt(limit)),
      productModel.countDocuments(filter)
    ]);

    return response.success(res, products, 'Products retrieved', 200, {
      page: parseInt(page), limit: parseInt(limit), total,
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    return response.serverError(res, 'Failed to get products', error);
  }
};

/**
 * GET /api/v1/products/:id
 * Public - Get product detail with variants
 */
const getById = async (req, res) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id, isDeleted: false })
      .populate('brand', 'name slug logo')
      .populate('category', 'name slug')
      .populate({ path: 'variants', match: { isDeleted: false } });

    if (!product) return response.notFound(res, 'Product not found');
    return response.success(res, product);
  } catch (error) {
    return response.serverError(res, 'Failed to get product', error);
  }
};

/**
 * GET /api/v1/products/slug/:slug
 */
const getBySlug = async (req, res) => {
  try {
    const product = await productModel.findOne({ slug: req.params.slug, isDeleted: false })
      .populate('brand', 'name slug logo')
      .populate('category', 'name slug')
      .populate({ path: 'variants', match: { isDeleted: false } });

    if (!product) return response.notFound(res, 'Product not found');
    return response.success(res, product);
  } catch (error) {
    return response.serverError(res, 'Failed to get product', error);
  }
};

/**
 * POST /api/v1/products
 */
const create = async (req, res) => {
  try {
    const { name, sku, description, originalPrice, salePrice, brand, category, thumbnail } = req.body;

    const existingSku = await productModel.findOne({ sku: sku.toUpperCase() });
    if (existingSku) return response.conflict(res, 'Product SKU already exists');

    const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();

    const product = await productModel.create({
      name, sku: sku.toUpperCase(), slug, description,
      originalPrice, salePrice: salePrice || originalPrice,
      brand, category, thumbnail: thumbnail || undefined
    });

    const populated = await product.populate([
      { path: 'brand', select: 'name slug logo' },
      { path: 'category', select: 'name slug' }
    ]);

    await logAction(req, 'CREATE', 'product', product._id, `Created product: ${name}`);
    return response.created(res, populated, 'Product created successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to create product', error);
  }
};

/**
 * PUT /api/v1/products/:id
 */
const update = async (req, res) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return response.notFound(res, 'Product not found');

    const { name, sku, description, originalPrice, salePrice, brand, category, thumbnail, isActive } = req.body;

    if (sku && sku.toUpperCase() !== product.sku) {
      const existingSku = await productModel.findOne({ sku: sku.toUpperCase(), _id: { $ne: req.params.id } });
      if (existingSku) return response.conflict(res, 'Product SKU already exists');
      product.sku = sku.toUpperCase();
    }

    if (name) {
      product.name = name;
      product.slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now();
    }
    if (description !== undefined) product.description = description;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (salePrice !== undefined) product.salePrice = salePrice;
    if (brand) product.brand = brand;
    if (category) product.category = category;
    if (thumbnail !== undefined) product.thumbnail = thumbnail;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();
    const populated = await product.populate([
      { path: 'brand', select: 'name slug logo' },
      { path: 'category', select: 'name slug' }
    ]);

    await logAction(req, 'UPDATE', 'product', product._id, `Updated product: ${product.name}`);
    return response.success(res, populated, 'Product updated successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to update product', error);
  }
};

/**
 * DELETE /api/v1/products/:id
 */
const remove = async (req, res) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return response.notFound(res, 'Product not found');

    product.isDeleted = true;
    await product.save();

    await logAction(req, 'DELETE', 'product', product._id, `Deleted product: ${product.name}`);
    return response.success(res, null, 'Product deleted successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to delete product', error);
  }
};

// ===================================================================
// EMBEDDED IMAGE MANAGEMENT (gộp từ ProductImage module)
// ===================================================================

/**
 * POST /api/v1/products/:id/images
 * Add image to product (upload file or URL)
 */
const addImage = async (req, res) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return response.notFound(res, 'Product not found');

    let url = req.body.url;
    if (req.file) {
      url = `${config.BASE_URL}/uploads/${req.file.filename}`;
    }
    if (!url) return response.badRequest(res, 'Image URL or file is required');

    const isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;

    // Nếu set primary, bỏ primary của ảnh cũ
    if (isPrimary) {
      product.images.forEach(img => { img.isPrimary = false; });
      product.thumbnail = url;
    }

    product.images.push({
      url,
      isPrimary: isPrimary || product.images.length === 0,
      sortOrder: req.body.sortOrder || product.images.length
    });

    // Nếu là ảnh đầu tiên, set làm thumbnail
    if (product.images.length === 1) {
      product.thumbnail = url;
    }

    await product.save();
    await logAction(req, 'UPDATE', 'product', product._id, 'Added image to product');
    return response.success(res, product.images, 'Image added successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to add image', error);
  }
};

/**
 * POST /api/v1/products/:id/images/multiple
 * Add multiple images
 */
const addMultipleImages = async (req, res) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return response.notFound(res, 'Product not found');

    if (!req.files || req.files.length === 0) {
      return response.badRequest(res, 'At least one image file is required');
    }

    for (let i = 0; i < req.files.length; i++) {
      const url = `${config.BASE_URL}/uploads/${req.files[i].filename}`;
      const isFirst = product.images.length === 0 && i === 0;
      product.images.push({
        url,
        isPrimary: isFirst,
        sortOrder: product.images.length
      });
      if (isFirst) product.thumbnail = url;
    }

    await product.save();
    await logAction(req, 'UPDATE', 'product', product._id, `Added ${req.files.length} images`);
    return response.success(res, product.images, `${req.files.length} images added`);
  } catch (error) {
    return response.serverError(res, 'Failed to add images', error);
  }
};

/**
 * PUT /api/v1/products/:id/images/:imageId
 * Update image (set primary, etc.)
 */
const updateImage = async (req, res) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return response.notFound(res, 'Product not found');

    const image = product.images.id(req.params.imageId);
    if (!image) return response.notFound(res, 'Image not found');

    if (req.body.isPrimary) {
      product.images.forEach(img => { img.isPrimary = false; });
      image.isPrimary = true;
      product.thumbnail = image.url;
    }
    if (req.body.sortOrder !== undefined) image.sortOrder = req.body.sortOrder;
    if (req.body.url) image.url = req.body.url;

    await product.save();
    return response.success(res, product.images, 'Image updated');
  } catch (error) {
    return response.serverError(res, 'Failed to update image', error);
  }
};

/**
 * DELETE /api/v1/products/:id/images/:imageId
 * Remove image from product
 */
const removeImage = async (req, res) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return response.notFound(res, 'Product not found');

    const image = product.images.id(req.params.imageId);
    if (!image) return response.notFound(res, 'Image not found');

    image.deleteOne();
    await product.save();
    return response.success(res, product.images, 'Image removed');
  } catch (error) {
    return response.serverError(res, 'Failed to remove image', error);
  }
};

module.exports = { getAll, getById, getBySlug, create, update, remove, addImage, addMultipleImages, updateImage, removeImage };
