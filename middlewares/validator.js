const { validationResult, body, param } = require('express-validator');
const response = require('./response');

/**
 * Run express-validator result check and return 422 on errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.validationError(
      res,
      errors.array().map(e => ({ field: e.path, message: e.msg }))
    );
  }
  next();
};

/**
 * Register validator rules
 */
const registerRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username only allows letters, numbers, underscore'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/).withMessage('Phone must be 10-11 digits')
];

/**
 * Login validator rules
 */
const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

/**
 * Change password validator rules
 */
const changePasswordRules = [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .custom((value, { req }) => {
      if (value === req.body.oldPassword) {
        throw new Error('New password must be different from old password');
      }
      return true;
    })
];

/**
 * Update profile validator rules
 */
const updateProfileRules = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/).withMessage('Phone must be 10-11 digits'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
];

/**
 * User Address validator rules
 */
const userAddressRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^[0-9]{10,11}$/).withMessage('Phone must be 10-11 digits'),
  body('province').trim().notEmpty().withMessage('Province is required'),
  body('district').trim().notEmpty().withMessage('District is required'),
  body('ward').trim().notEmpty().withMessage('Ward is required'),
  body('addressDetail').trim().notEmpty().withMessage('Address detail is required')
];

/**
 * MongoID param validator
 */
const mongoIdRules = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`${paramName} must be a valid MongoDB ObjectId`)
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  changePasswordRules,
  updateProfileRules,
  userAddressRules,
  mongoIdRules
};
