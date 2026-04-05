const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

// Database connection
const connectDB = require('./configs/database');
connectDB();

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== ROUTES =====

// System / Base
app.use('/', require('./routes/index'));

// ===== TV1: Auth & System (8 models) =====
app.use('/api/v1/auth', require('./modules/auth/authRoute'));
app.use('/api/v1/users', require('./modules/user/userRoute'));
app.use('/api/v1/user-addresses', require('./modules/userAddress/userAddressRoute'));
app.use('/api/v1/uploads', require('./modules/upload/uploadRoute'));
app.use('/api/v1/audit-logs', require('./modules/auditLog/auditLogRoute'));
app.use('/api/v1/notifications', require('./modules/notification/notificationRoute'));
app.use('/api/v1/roles', require('./modules/role/roleRoute'));

// ===== TV2: Product Management (1 domain - 4 schemas gộp) =====
app.use('/api/v1/brands', require('./modules/brand/brandRoute'));
app.use('/api/v1/categories', require('./modules/category/categoryRoute'));
app.use('/api/v1/products', require('./modules/product/productRoute'));
app.use('/api/v1/product-variants', require('./modules/productVariant/productVariantRoute'));

// ===== TV3: Cart, Checkout, Order =====
app.use('/api/v1/carts', require('./modules/cart/cartRoute'));
app.use('/api/v1/checkout', require('./modules/checkout/checkoutRoute'));
app.use('/api/v1/orders', require('./modules/order/orderRoute'));
app.use('/api/v1/coupons', require('./modules/coupon/couponRoute'));
app.use('/api/v1/promotions', require('./modules/promotion/promotionRoute'));
app.use('/api/v1/wishlists', require('./modules/wishlist/wishlistRoute'));
app.use('/api/v1/reviews', require('./modules/review/reviewRoute'));
app.use('/api/v1/shipments', require('./modules/shipment/shipmentRoute'));
app.use('/api/v1/return-requests', require('./modules/returnRequest/returnRequestRoute'));
app.use('/api/v1/refunds', require('./modules/refund/refundRoute'));
app.use('/api/v1/banners', require('./modules/banner/bannerRoute'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Centralized error handler
app.use(function (err, req, res, next) {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
      ...(req.app.get('env') === 'development' && { stack: err.stack })
    });
  }

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
