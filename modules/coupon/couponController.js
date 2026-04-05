const Discount = require('../../schemas/discounts');

const COUPON_KIND = 'coupon';

const toCouponPayload = (input = {}) => ({
  kind: COUPON_KIND,
  code: input.code ? String(input.code).toUpperCase().trim() : undefined,
  description: input.description || '',
  discountType: input.discountType,
  discountValue: input.discountValue,
  minOrderValue: input.minOrderValue ?? 0,
  maxDiscountAmount: input.maxDiscountAmount ?? null,
  startDate: input.startDate,
  endDate: input.endDate,
  usageLimit: input.usageLimit ?? null,
  usedCount: input.usedCount ?? 0,
  isActive: input.isActive ?? true,
  applicableUsers: Array.isArray(input.applicableUsers) ? input.applicableUsers : []
});

exports.create = async (req, res) => {
  try {
    if (!req.body.code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await Discount.create(toCouponPayload(req.body));
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const coupons = await Discount.find({ kind: COUPON_KIND }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const coupon = await Discount.findOne({ _id: req.params.id, kind: COUPON_KIND });

    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    if (updatePayload.code) {
      updatePayload.code = String(updatePayload.code).toUpperCase().trim();
    }
    delete updatePayload.kind;
    delete updatePayload.name;
    delete updatePayload.type;
    delete updatePayload.applicableProducts;
    delete updatePayload.applicableCategories;
    delete updatePayload.applicableBrands;

    const coupon = await Discount.findOneAndUpdate(
      { _id: req.params.id, kind: COUPON_KIND },
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const coupon = await Discount.findOneAndDelete({ _id: req.params.id, kind: COUPON_KIND });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkEligibility = async (req, res) => {
  try {
    const { code, orderValue } = req.body;
    const userId = req.user._id;

    const coupon = await Discount.findOne({ kind: COUPON_KIND, code: code.toUpperCase(), isActive: true });

    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code' });

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return res.status(400).json({ success: false, message: 'Coupon is expired or not yet active' });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }

    if (coupon.minOrderValue && orderValue < coupon.minOrderValue) {
      return res.status(400).json({ success: false, message: `Minimum order value of ${coupon.minOrderValue} required` });
    }

    if (coupon.applicableUsers && coupon.applicableUsers.length > 0) {
      const isEligible = coupon.applicableUsers.some((id) => id.toString() === userId.toString());
      if (!isEligible) {
        return res.status(400).json({ success: false, message: 'You are not eligible for this coupon' });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === 'percentage') {
      discountAmount = (orderValue * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    }

    res.status(200).json({ success: true, data: { coupon, discountAmount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
