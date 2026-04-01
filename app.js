const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors'); // Nhanh chóng thêm CORS để FE gọi dễ dàng

// Database connection
const connectDB = require('./configs/database');
connectDB();

const app = express();

// view engine setup (vẫn giữ nhưng tập trung làm REST API)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Cho phép truy cập ảnh public

// ===== ROUTES (Cấu trúc mới tập trung vào thư mục modules) =====

// System / Base
app.use('/', require('./routes/index'));

// New Modules Structure (Clean Code)
app.use('/api/v1/auth', require('./modules/auth/authRoute'));
app.use('/api/v1/users', require('./modules/user/userRoute'));
app.use('/api/v1/user-addresses', require('./modules/userAddress/userAddressRoute'));
app.use('/api/v1/uploads', require('./modules/upload/uploadRoute'));
app.use('/api/v1/audit-logs', require('./modules/auditLog/auditLogRoute'));
app.use('/api/v1/notifications', require('./modules/notification/notificationRoute'));
app.use('/api/v1/roles', require('./modules/role/roleRoute'));

// Legacy Routes (Giữ lại các API cũ nhóm đã làm cho Product/Category/Cart)
app.use('/api/v1/categories', require('./routes/categories'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/carts', require('./routes/carts'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Centralized error handler
app.use(function (err, req, res, next) {
  // Trả về JSON cho REST API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
      ...(req.app.get('env') === 'development' && { stack: err.stack })
    });
  }

  // HTML error cho các request non-API
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
