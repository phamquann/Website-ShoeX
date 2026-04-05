const mongoose = require('mongoose');
const config = require('../../configs');
const response = require('../../middlewares/response');
const Review = require('../../schemas/reviews');
const Order = require('../../schemas/orders');
const Product = require('../../schemas/products');

const MAX_REVIEW_IMAGES = 5;
const DEFAULT_BANNED_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'dm', 'vcl'];
const REVIEW_BANNED_WORDS = (process.env.REVIEW_BANNED_WORDS || DEFAULT_BANNED_WORDS.join(','))
  .split(',')
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

const emptyBreakdown = () => ({
  star1: 0,
  star2: 0,
  star3: 0,
  star4: 0,
  star5: 0
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseImagesFromBody = (rawImages) => {
  if (rawImages === undefined || rawImages === null) return null;

  if (Array.isArray(rawImages)) {
    return rawImages
      .map((value) => `${value}`.trim())
      .filter(Boolean);
  }

  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((value) => `${value}`.trim())
            .filter(Boolean);
        }
      } catch (error) {
        // Fall through to comma-based parsing when JSON parsing fails.
      }
    }

    return trimmed
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return [];
};

const getUploadedImageUrls = (files) => {
  if (!Array.isArray(files) || files.length === 0) return [];
  return files.map((file) => `${config.BASE_URL}/uploads/${file.filename}`);
};

const uniqueStrings = (values) => [...new Set(values.filter(Boolean))];

const getMatchedForbiddenWords = (comment = '') => {
  if (!comment || REVIEW_BANNED_WORDS.length === 0) return [];
  return REVIEW_BANNED_WORDS.filter((word) => {
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    return regex.test(comment);
  });
};

const normalizeSummary = (productDoc) => {
  const breakdown = productDoc?.ratingBreakdown?.toObject
    ? productDoc.ratingBreakdown.toObject()
    : productDoc?.ratingBreakdown || {};

  return {
    averageRating: productDoc?.averageRating || 0,
    totalReviews: productDoc?.reviewCount || 0,
    ratingBreakdown: {
      ...emptyBreakdown(),
      ...breakdown
    }
  };
};

const getProductReviewSummary = async (productId) => {
  const product = await Product.findById(productId)
    .select('averageRating reviewCount ratingBreakdown');

  if (!product) return null;
  return normalizeSummary(product);
};

const refreshProductReviewStats = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) return;

  const [aggregated] = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId)
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
        star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
      }
    }
  ]);

  const breakdown = emptyBreakdown();
  const reviewCount = aggregated?.reviewCount || 0;

  if (aggregated) {
    breakdown.star1 = aggregated.star1 || 0;
    breakdown.star2 = aggregated.star2 || 0;
    breakdown.star3 = aggregated.star3 || 0;
    breakdown.star4 = aggregated.star4 || 0;
    breakdown.star5 = aggregated.star5 || 0;
  }

  await Product.findByIdAndUpdate(productId, {
    averageRating: aggregated ? Number((aggregated.averageRating || 0).toFixed(2)) : 0,
    reviewCount,
    ratingBreakdown: breakdown
  });
};

exports.getByProduct = async (req, res) => {
  try {
    const { star, hasImages, page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const filter = { product: req.params.id };

    if (star !== undefined) {
      const starNumber = Number(star);
      if (!Number.isInteger(starNumber) || starNumber < 1 || starNumber > 5) {
        return response.badRequest(res, 'star must be an integer between 1 and 5');
      }
      filter.rating = starNumber;
    }

    if (hasImages !== undefined) {
      if (hasImages !== 'true' && hasImages !== 'false') {
        return response.badRequest(res, 'hasImages must be either true or false');
      }
      filter['images.0'] = hasImages === 'true' ? { $exists: true } : { $exists: false };
    }

    const [reviews, total, summary] = await Promise.all([
      Review.find(filter)
        .populate('user', 'username fullName email avatarUrl')
        .sort({ created_at: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber),
      Review.countDocuments(filter),
      getProductReviewSummary(req.params.id)
    ]);

    if (!summary) {
      return response.notFound(res, 'Product not found');
    }

    return response.success(res, reviews, 'Reviews retrieved', 200, {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      summary
    });
  } catch (error) {
    return response.serverError(res, 'Failed to get reviews', error);
  }
};

exports.getSummaryByProduct = async (req, res) => {
  try {
    const summary = await getProductReviewSummary(req.params.id);
    if (!summary) return response.notFound(res, 'Product not found');

    return response.success(res, summary, 'Review summary retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get review summary', error);
  }
};

exports.getMine = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('product', 'name slug thumbnail averageRating reviewCount')
      .sort({ created_at: -1 });

    return response.success(res, reviews, 'My reviews retrieved');
  } catch (error) {
    return response.serverError(res, 'Failed to get your reviews', error);
  }
};

exports.getReviewableItems = async (req, res) => {
  try {
    const { page = 1, limit = 10, reviewed } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    if (reviewed !== undefined && reviewed !== 'true' && reviewed !== 'false') {
      return response.badRequest(res, 'reviewed must be true or false');
    }

    const filter = {
      user: req.user._id,
      status: 'completed',
      isReceivedConfirmed: true
    };

    const skip = (pageNumber - 1) * limitNumber;
    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .select('_id orderCode status completedAt isReceivedConfirmed receivedConfirmedAt createdAt items')
        .sort({ completedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Order.countDocuments(filter)
    ]);

    const orderIds = orders.map((order) => order._id);
    const reviews = orderIds.length
      ? await Review.find({
        user: req.user._id,
        order: { $in: orderIds }
      })
        .select('_id order product rating comment images created_at')
        .lean()
      : [];

    const reviewMap = new Map(
      reviews.map((review) => [`${review.order.toString()}_${review.product.toString()}`, review])
    );

    const data = orders
      .map((order) => {
        const items = (order.items || [])
          .map((item) => {
            const key = `${order._id.toString()}_${item.product.toString()}`;
            const reviewedItem = reviewMap.get(key) || null;

            return {
              productId: item.product,
              productName: item.productName,
              thumbnail: item.thumbnail,
              quantity: item.quantity,
              price: item.price,
              reviewed: Boolean(reviewedItem),
              reviewId: reviewedItem ? reviewedItem._id : null,
              rating: reviewedItem ? reviewedItem.rating : null,
              reviewedAt: reviewedItem ? reviewedItem.created_at : null
            };
          })
          .filter((item) => {
            if (reviewed === undefined) return true;
            return reviewed === 'true' ? item.reviewed : !item.reviewed;
          });

        return {
          orderId: order._id,
          orderCode: order.orderCode,
          status: order.status,
          completedAt: order.completedAt,
          isReceivedConfirmed: order.isReceivedConfirmed,
          receivedConfirmedAt: order.receivedConfirmedAt,
          createdAt: order.createdAt,
          items,
          hasUnreviewedItems: items.some((item) => !item.reviewed)
        };
      })
      .filter((order) => order.items.length > 0);

    return response.success(res, data, 'Reviewable items retrieved', 200, {
      page: pageNumber,
      limit: limitNumber,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limitNumber)
    });
  } catch (error) {
    return response.serverError(res, 'Failed to get reviewable items', error);
  }
};

exports.create = async (req, res) => {
  try {
    const { productId, orderId } = req.body;
    const userId = req.user._id;
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return response.badRequest(res, 'productId is required and must be a valid ID');
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return response.badRequest(res, 'orderId is required and must be a valid ID');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return response.badRequest(res, 'Rating must be an integer between 1 and 5');
    }

    if (comment.length > 1000) {
      return response.badRequest(res, 'Comment must not exceed 1000 characters');
    }

    const matchedWords = getMatchedForbiddenWords(comment);
    if (matchedWords.length > 0) {
      return response.badRequest(res, `Comment contains prohibited words: ${matchedWords.join(', ')}`);
    }

    const bodyImages = parseImagesFromBody(req.body.images) || [];
    const uploadedImages = getUploadedImageUrls(req.files);
    const images = uniqueStrings([...bodyImages, ...uploadedImages]);

    if (images.length > MAX_REVIEW_IMAGES) {
      return response.badRequest(res, `A review can contain at most ${MAX_REVIEW_IMAGES} images`);
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) return response.notFound(res, 'Product not found');

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      status: 'completed',
      isReceivedConfirmed: true,
      'items.product': productId
    });

    if (!order) {
      return response.forbidden(res, 'You can only review products after confirming order receipt');
    }

    const existingReview = await Review.findOne({
      user: userId,
      order: orderId,
      product: productId
    });

    if (existingReview) {
      return response.conflict(res, 'This order item has already been reviewed');
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      order: orderId,
      rating,
      comment,
      images
    });

    await refreshProductReviewStats(productId);

    const [populatedReview, summary] = await Promise.all([
      Review.findById(review._id)
        .populate('user', 'username fullName email avatarUrl')
        .populate('product', 'name slug thumbnail'),
      getProductReviewSummary(productId)
    ]);

    return response.created(res, {
      review: populatedReview,
      summary
    }, 'Review created successfully');
  } catch (error) {
    if (error.code === 11000) {
      return response.conflict(res, 'This order item has already been reviewed');
    }
    return response.serverError(res, 'Failed to create review', error);
  }
};

exports.createForProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user._id;
    const { orderId } = req.body;
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return response.badRequest(res, 'orderId is required and must be a valid ID');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return response.badRequest(res, 'Rating must be an integer between 1 and 5');
    }

    if (comment.length > 1000) {
      return response.badRequest(res, 'Comment must not exceed 1000 characters');
    }

    const matchedWords = getMatchedForbiddenWords(comment);
    if (matchedWords.length > 0) {
      return response.badRequest(res, `Comment contains prohibited words: ${matchedWords.join(', ')}`);
    }

    const bodyImages = parseImagesFromBody(req.body.images) || [];
    const uploadedImages = getUploadedImageUrls(req.files);
    const images = uniqueStrings([...bodyImages, ...uploadedImages]);

    if (images.length > MAX_REVIEW_IMAGES) {
      return response.badRequest(res, `A review can contain at most ${MAX_REVIEW_IMAGES} images`);
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) return response.notFound(res, 'Product not found');

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      status: 'completed',
      isReceivedConfirmed: true,
      'items.product': productId
    });

    if (!order) {
      return response.forbidden(res, 'You can only review products after confirming order receipt');
    }

    const existingReview = await Review.findOne({
      user: userId,
      order: orderId,
      product: productId
    });

    if (existingReview) {
      return response.conflict(res, 'This order item has already been reviewed');
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      order: orderId,
      rating,
      comment,
      images
    });

    await refreshProductReviewStats(productId);

    const [populatedReview, summary] = await Promise.all([
      Review.findById(review._id)
        .populate('user', 'username fullName email avatarUrl')
        .populate('product', 'name slug thumbnail'),
      getProductReviewSummary(productId)
    ]);

    return response.created(res, {
      review: populatedReview,
      summary
    }, 'Review created successfully');
  } catch (error) {
    if (error.code === 11000) {
      return response.conflict(res, 'This order item has already been reviewed');
    }
    return response.serverError(res, 'Failed to create review', error);
  }
};

exports.update = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
    if (!review) return response.notFound(res, 'Review not found or unauthorized');

    if (req.body.rating !== undefined) {
      const rating = Number(req.body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return response.badRequest(res, 'Rating must be an integer between 1 and 5');
      }
      review.rating = rating;
    }

    if (req.body.comment !== undefined) {
      const comment = req.body.comment === null ? '' : `${req.body.comment}`.trim();
      if (comment.length > 1000) {
        return response.badRequest(res, 'Comment must not exceed 1000 characters');
      }

      const matchedWords = getMatchedForbiddenWords(comment);
      if (matchedWords.length > 0) {
        return response.badRequest(res, `Comment contains prohibited words: ${matchedWords.join(', ')}`);
      }

      review.comment = comment;
    }

    const uploadedImages = getUploadedImageUrls(req.files);
    const hasIncomingImages = req.body.images !== undefined || uploadedImages.length > 0;

    if (hasIncomingImages) {
      if (req.body.images !== undefined) {
        const bodyImages = parseImagesFromBody(req.body.images) || [];
        review.images = uniqueStrings([...bodyImages, ...uploadedImages]);
      } else {
        review.images = uniqueStrings([...(review.images || []), ...uploadedImages]);
      }
    }

    if (review.images.length > MAX_REVIEW_IMAGES) {
      return response.badRequest(res, `A review can contain at most ${MAX_REVIEW_IMAGES} images`);
    }

    await review.save();
    await refreshProductReviewStats(review.product);

    const [updatedReview, summary] = await Promise.all([
      Review.findById(review._id)
        .populate('user', 'username fullName email avatarUrl')
        .populate('product', 'name slug thumbnail'),
      getProductReviewSummary(review.product)
    ]);

    return response.success(res, {
      review: updatedReview,
      summary
    }, 'Review updated successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to update review', error);
  }
};

exports.remove = async (req, res) => {
  try {
    const isAdmin = req.user.role?.name === 'ADMIN';
    const condition = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };

    const review = await Review.findOneAndDelete(condition);
    if (!review) return response.notFound(res, 'Review not found or unauthorized');

    await refreshProductReviewStats(review.product);
    const summary = await getProductReviewSummary(review.product);

    return response.success(res, { summary }, 'Deleted successfully');
  } catch (error) {
    return response.serverError(res, 'Failed to delete review', error);
  }
};
