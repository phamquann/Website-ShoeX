require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/NNPTUD-S3",

  // JWT
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || "access_secret_key_change_in_production",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "refresh_secret_key_change_in_production",
  ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES || "7d",
  REFRESH_TOKEN_EXPIRES_MS: 7 * 24 * 60 * 60 * 1000, // 7 days in ms

  // Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads/",
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],

  // Base URL
  BASE_URL: process.env.BASE_URL || "http://localhost:3000",

  // Email
  MAIL_HOST: process.env.MAIL_HOST || "smtp.mailtrap.io",
  MAIL_PORT: process.env.MAIL_PORT || 2525,
  MAIL_USER: process.env.MAIL_USER || "",
  MAIL_PASS: process.env.MAIL_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "noreply@nnptud.com",

  // Account lock
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_DURATION_MS: 24 * 60 * 60 * 1000 // 24h
};
