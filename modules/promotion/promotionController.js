const Discount = require('../../schemas/discounts');

const PROMOTION_KIND = 'promotion';

const toPromotionPayload = (input = {}) => ({
  kind: PROMOTION_KIND,
  name: input.name,
  description: input.description || '',
  type: input.type,
  discountType: input.discountType,
  discountValue: input.discountValue,
  startDate: input.startDate,
  endDate: input.endDate,
  applicableProducts: Array.isArray(input.applicableProducts) ? input.applicableProducts : [],
  applicableCategories: Array.isArray(input.applicableCategories) ? input.applicableCategories : [],
  applicableBrands: Array.isArray(input.applicableBrands) ? input.applicableBrands : [],
  isActive: input.isActive ?? true
});

exports.create = async (req, res) => {
  try {
    const promotion = await Discount.create(toPromotionPayload(req.body));
    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const promotions = await Discount.find({ kind: PROMOTION_KIND })
      .populate('applicableProducts')
      .populate('applicableCategories')
      .populate('applicableBrands');

    res.status(200).json({ success: true, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const promotion = await Discount.findOne({ _id: req.params.id, kind: PROMOTION_KIND });

    if (!promotion) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    delete updatePayload.kind;
    delete updatePayload.code;
    delete updatePayload.usedCount;

    const promotion = await Discount.findOneAndUpdate(
      { _id: req.params.id, kind: PROMOTION_KIND },
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!promotion) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const promotion = await Discount.findOneAndDelete({ _id: req.params.id, kind: PROMOTION_KIND });
    if (!promotion) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
