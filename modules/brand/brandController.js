const brandModel = require('../../schemas/brands');
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const slugify = require('slugify');

/**
 * GET /api/v1/brands
 * Public - Get all brands
 */
const getAll = async (req, res) => {
  try {
    const { name, page = 1, limit = 50 } = req.query;
    const filter = { isDeleted: false };

    if (name) {
      filter.name = new RegExp(name, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [brands, total] = await Promise.all([
      brandModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      brandModel.countDocuments(filter)
    ]);

    return response.success(res, brands, 'Brands retrieved successfully', 200, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    return response.serverError(res, 'Failed to get brands', error);
  }
};

/**
 * GET /api/v1/brands/:id
 * Public - Get brand by ID
 */
const getById = async (req, res) => {
  try {
    const brand = await brandModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!brand) {
      return response.notFound(res, 'Brand not found');
    }
    return response.success(res, brand);
  } catch (error) {
    return response.serverError(res, 'Failed to get brand', error);
  }
};

/**
 * POST /api/v1/brands
 * Admin/Staff - Create brand
 */
const create = async (req, res) => {
  try {
    const { name, logo, description } = req.body;

    const existing = await brandModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return response.conflict(res, 'Brand name already exists');
    }

    const brand = await brandModel.create({
      name,
      slug: slugify(name, { lower: true, strict: true }),
      logo: logo || '',
      description: description || ''
    });

    await logAction(req, 'CREATE', 'brand', brand._id, `Created brand: ${name}`);
    return response.created(res, brand, 'Brand created successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to create brand', error);
  }
};

/**
 * PUT /api/v1/brands/:id
 * Admin/Staff - Update brand
 */
const update = async (req, res) => {
  try {
    const brand = await brandModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!brand) {
      return response.notFound(res, 'Brand not found');
    }

    const { name, logo, description } = req.body;

    if (name && name !== brand.name) {
      const existing = await brandModel.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return response.conflict(res, 'Brand name already exists');
      }
      brand.name = name;
      brand.slug = slugify(name, { lower: true, strict: true });
    }

    if (logo !== undefined) brand.logo = logo;
    if (description !== undefined) brand.description = description;

    await brand.save();
    await logAction(req, 'UPDATE', 'brand', brand._id, `Updated brand: ${brand.name}`);
    return response.success(res, brand, 'Brand updated successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to update brand', error);
  }
};

/**
 * DELETE /api/v1/brands/:id
 * Admin - Soft delete brand
 */
const remove = async (req, res) => {
  try {
    const brand = await brandModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!brand) {
      return response.notFound(res, 'Brand not found');
    }

    brand.isDeleted = true;
    await brand.save();

    await logAction(req, 'DELETE', 'brand', brand._id, `Deleted brand: ${brand.name}`);
    return response.success(res, null, 'Brand deleted successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to delete brand', error);
  }
};

module.exports = { getAll, getById, create, update, remove };
