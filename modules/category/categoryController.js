const categoryModel = require('../../schemas/categories');
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const slugify = require('slugify');

/**
 * GET /api/v1/categories
 */
const getAll = async (req, res) => {
  try {
    const { name, page = 1, limit = 50 } = req.query;
    const filter = { isDeleted: false };
    if (name) filter.name = new RegExp(name, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [categories, total] = await Promise.all([
      categoryModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      categoryModel.countDocuments(filter)
    ]);

    return response.success(res, categories, 'Categories retrieved', 200, {
      page: parseInt(page), limit: parseInt(limit), total,
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    return response.serverError(res, 'Failed to get categories', error);
  }
};

/**
 * GET /api/v1/categories/:id
 */
const getById = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!category) return response.notFound(res, 'Category not found');
    return response.success(res, category);
  } catch (error) {
    return response.serverError(res, 'Failed to get category', error);
  }
};

/**
 * GET /api/v1/categories/:id/products
 */
const getProducts = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ _id: req.params.id, isDeleted: false })
      .populate({
        path: 'products',
        match: { isDeleted: false, isActive: true },
        populate: [
          { path: 'brand', select: 'name slug logo' },
          { path: 'category', select: 'name slug' }
        ]
      });
    if (!category) return response.notFound(res, 'Category not found');
    return response.success(res, category.products);
  } catch (error) {
    return response.serverError(res, 'Failed to get products by category', error);
  }
};

/**
 * POST /api/v1/categories
 */
const create = async (req, res) => {
  try {
    const { name, image, description } = req.body;

    const existing = await categoryModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) return response.conflict(res, 'Category name already exists');

    const category = await categoryModel.create({
      name,
      slug: slugify(name, { lower: true, strict: true }),
      image: image || undefined,
      description: description || ''
    });

    await logAction(req, 'CREATE', 'category', category._id, `Created category: ${name}`);
    return response.created(res, category, 'Category created successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to create category', error);
  }
};

/**
 * PUT /api/v1/categories/:id
 */
const update = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!category) return response.notFound(res, 'Category not found');

    const { name, image, description } = req.body;
    if (name && name !== category.name) {
      const existing = await categoryModel.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: req.params.id }
      });
      if (existing) return response.conflict(res, 'Category name already exists');
      category.name = name;
      category.slug = slugify(name, { lower: true, strict: true });
    }
    if (image !== undefined) category.image = image;
    if (description !== undefined) category.description = description;

    await category.save();
    await logAction(req, 'UPDATE', 'category', category._id, `Updated category: ${category.name}`);
    return response.success(res, category, 'Category updated successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to update category', error);
  }
};

/**
 * DELETE /api/v1/categories/:id
 */
const remove = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!category) return response.notFound(res, 'Category not found');

    category.isDeleted = true;
    await category.save();

    await logAction(req, 'DELETE', 'category', category._id, `Deleted category: ${category.name}`);
    return response.success(res, null, 'Category deleted successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to delete category', error);
  }
};

module.exports = { getAll, getById, getProducts, create, update, remove };
