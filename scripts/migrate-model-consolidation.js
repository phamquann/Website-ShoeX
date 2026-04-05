const mongoose = require('mongoose');
const connectDB = require('../configs/database');

const User = require('../schemas/users');
const Cart = require('../schemas/carts');
const Discount = require('../schemas/discounts');

const getCollection = (name) => mongoose.connection.collection(name);

const migrateUserEmbeddedData = async () => {
  const userAddressesCollection = getCollection('useraddresses');
  const wishlistsCollection = getCollection('wishlists');
  const refreshTokensCollection = getCollection('refreshtokens');

  const users = await User.find().select('addresses wishlist refreshTokens');

  let addressMigratedUsers = 0;
  let wishlistMigratedUsers = 0;
  let refreshTokenMigratedUsers = 0;

  for (const user of users) {
    let changed = false;

    if ((!user.addresses || user.addresses.length === 0)) {
      const legacyAddresses = await userAddressesCollection
        .find({ user: user._id, isDeleted: false })
        .sort({ isDefault: -1, createdAt: -1 })
        .toArray();

      if (legacyAddresses.length > 0) {
        user.addresses = legacyAddresses.map((address) => ({
          fullName: address.fullName,
          phone: address.phone,
          province: address.province,
          district: address.district,
          ward: address.ward,
          addressDetail: address.addressDetail,
          isDefault: Boolean(address.isDefault),
          isDeleted: false,
          createdAt: address.createdAt,
          updatedAt: address.updatedAt
        }));

        if (!user.addresses.some((item) => item.isDefault)) {
          user.addresses[0].isDefault = true;
        }

        addressMigratedUsers += 1;
        changed = true;
      }
    }

    if ((!user.wishlist || user.wishlist.length === 0)) {
      const legacyWishlist = await wishlistsCollection.findOne(
        { user: user._id },
        { projection: { products: 1 } }
      );

      if (legacyWishlist && Array.isArray(legacyWishlist.products) && legacyWishlist.products.length > 0) {
        user.wishlist = legacyWishlist.products;
        wishlistMigratedUsers += 1;
        changed = true;
      }
    }

    if ((!user.refreshTokens || user.refreshTokens.length === 0)) {
      const legacyTokens = await refreshTokensCollection
        .find({ user: user._id })
        .sort({ createdAt: -1 })
        .toArray();

      if (legacyTokens.length > 0) {
        user.refreshTokens = legacyTokens.map((token) => ({
          token: token.token,
          expiresAt: token.expiresAt,
          isRevoked: token.isRevoked,
          userAgent: token.userAgent || '',
          ipAddress: token.ipAddress || '',
          createdAt: token.createdAt,
          updatedAt: token.updatedAt
        }));
        refreshTokenMigratedUsers += 1;
        changed = true;
      }
    }

    if (changed) {
      await user.save();
    }
  }

  return {
    addressMigratedUsers,
    wishlistMigratedUsers,
    refreshTokenMigratedUsers
  };
};

const migrateCartItems = async () => {
  const cartItemsCollection = getCollection('cartitems');

  const carts = await Cart.find().select('items');
  let migratedCarts = 0;

  for (const cart of carts) {
    if (Array.isArray(cart.items) && cart.items.length > 0) {
      continue;
    }

    const legacyItems = await cartItemsCollection
      .find({ cart: cart._id }, { projection: { product: 1, variant: 1, quantity: 1 } })
      .sort({ createdAt: 1 })
      .toArray();

    if (!legacyItems.length) {
      continue;
    }

    cart.items = legacyItems.map((item) => ({
      product: item.product,
      variant: item.variant,
      quantity: item.quantity
    }));

    await cart.save();
    migratedCarts += 1;
  }

  return { migratedCarts };
};

const migrateDiscounts = async () => {
  const couponsCollection = getCollection('coupons');
  const promotionsCollection = getCollection('promotions');

  const coupons = await couponsCollection.find({}).toArray();
  const promotions = await promotionsCollection.find({}).toArray();

  let migratedCoupons = 0;
  let migratedPromotions = 0;

  for (const coupon of coupons) {
    const code = String(coupon.code || '').toUpperCase().trim();
    if (!code) continue;

    const result = await Discount.updateOne(
      { kind: 'coupon', code },
      {
        $setOnInsert: {
          kind: 'coupon',
          code,
          description: coupon.description || '',
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderValue: coupon.minOrderValue,
          maxDiscountAmount: coupon.maxDiscountAmount,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          usageLimit: coupon.usageLimit,
          usedCount: coupon.usedCount,
          isActive: coupon.isActive,
          applicableUsers: coupon.applicableUsers || []
        }
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      migratedCoupons += 1;
    }
  }

  for (const promotion of promotions) {
    const result = await Discount.updateOne(
      { _id: promotion._id, kind: 'promotion' },
      {
        $setOnInsert: {
          _id: promotion._id,
          kind: 'promotion',
          name: promotion.name,
          description: promotion.description || '',
          type: promotion.type,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
          startDate: promotion.startDate,
          endDate: promotion.endDate,
          applicableProducts: promotion.applicableProducts || [],
          applicableCategories: promotion.applicableCategories || [],
          applicableBrands: promotion.applicableBrands || [],
          isActive: promotion.isActive
        }
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      migratedPromotions += 1;
    }
  }

  return { migratedCoupons, migratedPromotions };
};

const run = async () => {
  try {
    await connectDB();

    console.log('Starting model consolidation migration...');

    const userResult = await migrateUserEmbeddedData();
    const cartResult = await migrateCartItems();
    const discountResult = await migrateDiscounts();

    console.log('Migration completed.');
    console.log({
      userResult,
      cartResult,
      discountResult
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
