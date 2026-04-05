const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../../configs');
const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const userModel = require('../../schemas/users');
const roleModel = require('../../schemas/roles');

const findEmbeddedToken = (user, token) => {
  if (!user || !Array.isArray(user.refreshTokens)) return null;
  return user.refreshTokens.find((item) => item.token === token) || null;
};

const revokeEmbeddedToken = async (userId, token) => {
  return userModel.updateOne(
    { _id: userId, 'refreshTokens.token': token },
    {
      $set: {
        'refreshTokens.$.isRevoked': true,
        'refreshTokens.$.updatedAt': new Date()
      }
    }
  );
};

const pruneEmbeddedTokens = async (userId) => {
  await userModel.updateOne(
    { _id: userId },
    {
      $pull: {
        refreshTokens: {
          $or: [
            { isRevoked: true },
            { expiresAt: { $lte: new Date() } }
          ]
        }
      }
    }
  );
};

/**
 * Generate tokens helper
 */
const generateTokens = async (userId, userAgent = '', ipAddress = '') => {
  const accessToken = jwt.sign(
    { id: userId },
    config.ACCESS_TOKEN_SECRET,
    { expiresIn: config.ACCESS_TOKEN_EXPIRES }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    config.REFRESH_TOKEN_SECRET,
    { expiresIn: config.REFRESH_TOKEN_EXPIRES }
  );

  // Save refresh token in user document
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_EXPIRES_MS);
  await pruneEmbeddedTokens(userId);
  await userModel.updateOne(
    { _id: userId },
    {
      $push: {
        refreshTokens: {
          token: refreshToken,
          expiresAt,
          isRevoked: false,
          userAgent,
          ipAddress
        }
      }
    }
  );

  return { accessToken, refreshToken };
};

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;

    // Check duplicates
    const existUser = await userModel.findOne({
      $or: [{ username }, { email }],
      isDeleted: false
    });
    if (existUser) {
      if (existUser.username === username) {
        return response.conflict(res, "Username already exists");
      }
      return response.conflict(res, "Email already exists");
    }

    // Get default CUSTOMER role
    let defaultRole = await roleModel.findOne({ name: "CUSTOMER", isDeleted: false });
    if (!defaultRole) {
      defaultRole = await roleModel.create({ name: "CUSTOMER", description: "Default customer role" });
    }

    const newUser = new userModel({
      username,
      email,
      password,
      fullName: fullName || "",
      phone: phone || "",
      role: defaultRole._id
    });
    await newUser.save();
    await newUser.populate('role', 'name');

    req.user = newUser; // Temporary attach for audit log
    await logAction(req, "REGISTER", "user", newUser._id, { username, email });

    return response.created(res, {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      phone: newUser.phone,
      avatarUrl: newUser.avatarUrl,
      status: newUser.status,
      role: newUser.role,
      createdAt: newUser.createdAt
    }, "Registration successful");

  } catch (error) {
    return response.serverError(res, "Registration failed", error);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await userModel.findOne({
      $or: [{ username }, { email: username }],
      isDeleted: false
    }).populate('role', 'name');

    if (!user) {
      return response.unauthorized(res, "Invalid username or password");
    }

    // Check lock
    if (user.lockTime && user.lockTime > Date.now()) {
      const remaining = Math.ceil((user.lockTime - Date.now()) / 60000);
      await logAction(req, "LOGIN_FAILED_LOCKED", "user", user._id, null, "failed");
      return response.forbidden(res, `Account is locked. Try again in ${remaining} minutes`);
    }

    if (!user.status) {
      return response.forbidden(res, "Account has been disabled by admin");
    }

    // Compare password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      user.loginCount = (user.loginCount || 0) + 1;
      if (user.loginCount >= config.MAX_LOGIN_ATTEMPTS) {
        user.lockTime = new Date(Date.now() + config.LOCK_DURATION_MS);
        user.loginCount = 0;
      }
      await user.save();
      await logAction(req, "LOGIN_FAILED", "user", user._id, { attempt: user.loginCount }, "failed");
      return response.unauthorized(res, "Invalid username or password");
    }

    // Success - reset counter
    user.loginCount = 0;
    user.lockTime = null;
    await user.save();

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    const { accessToken, refreshToken } = await generateTokens(user._id, userAgent, ipAddress);

    req.user = user; // Temporary attach for audit log
    await logAction(req, "LOGIN", "user", user._id);

    return response.success(res, {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role
      }
    }, "Login successful");

  } catch (error) {
    return response.serverError(res, "Login failed", error);
  }
};

/**
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return response.badRequest(res, "Refresh token is required");
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return response.unauthorized(res, "Invalid or expired refresh token");
    }

    const user = await userModel.findOne({ _id: decoded.id, isDeleted: false, status: true });
    if (!user) {
      return response.unauthorized(res, "User not found");
    }

    const embeddedToken = findEmbeddedToken(user, token);
    const isEmbeddedValid = Boolean(
      embeddedToken &&
      !embeddedToken.isRevoked &&
      embeddedToken.expiresAt > new Date()
    );

    if (isEmbeddedValid) {
      await revokeEmbeddedToken(user._id, token);
    } else {
      return response.unauthorized(res, "Refresh token not found or revoked");
    }

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || '';
    const tokens = await generateTokens(user._id, userAgent, ipAddress);

    return response.success(res, tokens, "Token refreshed successfully");

  } catch (error) {
    return response.serverError(res, "Token refresh failed", error);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await revokeEmbeddedToken(req.user._id, token);
    }

    await logAction(req, "LOGOUT", "user", req.user._id);
    return response.success(res, null, "Logged out successfully");

  } catch (error) {
    return response.serverError(res, "Logout failed", error);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = req.user;
    return response.success(res, {
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    return response.serverError(res, "Failed to get user info", error);
  }
};

/**
 * PUT /api/v1/auth/me  - Update own profile
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, email, avatarUrl } = req.body;
    const userId = req.user._id;

    // Check email conflict
    if (email && email !== req.user.email) {
      const exists = await userModel.findOne({ email, isDeleted: false, _id: { $ne: userId } });
      if (exists) return response.conflict(res, "Email already in use");
    }

    const updated = await userModel.findByIdAndUpdate(
      userId,
      { fullName, phone, email, avatarUrl },
      { new: true, runValidators: true }
    ).populate('role', 'name');

    await logAction(req, "UPDATE_PROFILE", "user", userId);
    return response.success(res, {
      _id: updated._id,
      username: updated.username,
      email: updated.email,
      fullName: updated.fullName,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      role: updated.role
    }, "Profile updated successfully");

  } catch (error) {
    return response.serverError(res, "Profile update failed", error);
  }
};

/**
 * PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await userModel.findById(req.user._id);

    const isMatch = bcrypt.compareSync(oldPassword, user.password);
    if (!isMatch) {
      return response.badRequest(res, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens on password change
    await userModel.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });

    await logAction(req, "CHANGE_PASSWORD", "user", user._id);
    return response.success(res, null, "Password changed successfully. Please login again");

  } catch (error) {
    return response.serverError(res, "Change password failed", error);
  }
};

/**
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return response.badRequest(res, "Email is required");

    const user = await userModel.findOne({ email, isDeleted: false });
    if (user) {
      user.forgotPasswordToken = crypto.randomBytes(32).toString('hex');
      user.forgotPasswordTokenExp = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await user.save();
      // TODO: send email with reset link
      console.log(`Reset link: ${config.BASE_URL}/api/v1/auth/reset-password/${user.forgotPasswordToken}`);
    }

    // Always return same message (security: don't reveal if email exists)
    return response.success(res, null, "If email exists, a reset link has been sent");

  } catch (error) {
    return response.serverError(res, "Forgot password failed", error);
  }
};

/**
 * POST /api/v1/auth/reset-password/:token
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) return response.badRequest(res, "New password is required");

    const user = await userModel.findOne({
      forgotPasswordToken: token,
      forgotPasswordTokenExp: { $gt: new Date() },
      isDeleted: false
    });

    if (!user) {
      return response.badRequest(res, "Invalid or expired reset token");
    }

    user.password = password;
    user.forgotPasswordToken = null;
    user.forgotPasswordTokenExp = null;
    await user.save();

    await userModel.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });

    return response.success(res, null, "Password reset successfully. Please login with new password");

  } catch (error) {
    return response.serverError(res, "Reset password failed", error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};
