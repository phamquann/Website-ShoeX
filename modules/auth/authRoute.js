const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { authenticate } = require('../../middlewares/auth');
const {
  validate,
  registerRules,
  loginRules,
  changePasswordRules,
  updateProfileRules
} = require('../../middlewares/validator');

/**
 * Auth Routes - /api/v1/auth
 * 
 * Public routes (no authentication needed):
 *   POST /register
 *   POST /login
 *   POST /refresh-token
 *   POST /forgot-password
 *   POST /reset-password/:token
 * 
 * Protected routes (Bearer token required):
 *   GET  /me
 *   PUT  /me
 *   PUT  /change-password
 *   POST /logout
 */

// Public
router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Protected
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, updateProfileRules, validate, authController.updateProfile);
router.put('/change-password', authenticate, changePasswordRules, validate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
