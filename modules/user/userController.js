const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const userModel = require('../../schemas/users');
const roleModel = require('../../schemas/roles');

/**
 * GET /api/v1/users
 * Admin/Staff: Get all users with pagination
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const keyword = req.query.keyword || '';

    const filter = {
      isDeleted: false,
      ...(keyword && {
        $or: [
          { username: { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } },
          { fullName: { $regex: keyword, $options: 'i' } }
        ]
      })
    };

    const [users, total] = await Promise.all([
      userModel.find(filter).populate('role', 'name description').skip(skip).limit(limit).sort({ createdAt: -1 }),
      userModel.countDocuments(filter)
    ]);

    return response.success(res, users, "Users retrieved successfully", 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return response.serverError(res, "Failed to get users", error);
  }
};

/**
 * GET /api/v1/users/:id
 * Admin: Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const user = await userModel.findOne({
      _id: req.params.id,
      isDeleted: false
    }).populate({ path: 'role', select: 'name description' });

    if (!user) return response.notFound(res, "User not found");

    return response.success(res, user);
  } catch (error) {
    return response.serverError(res, "Failed to get user", error);
  }
};

/**
 * POST /api/v1/users
 * Admin: Create user (with specific role)
 */
const createUser = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, role, status } = req.body;

    const exists = await userModel.findOne({ $or: [{ username }, { email }], isDeleted: false });
    if (exists) {
      return response.conflict(res, exists.username === username ? "Username already exists" : "Email already exists");
    }

    const roleDoc = await roleModel.findOne({ _id: role, isDeleted: false });
    if (!roleDoc) return response.badRequest(res, "Invalid role ID");

    const newUser = new userModel({ username, email, password, fullName, phone, role, status });
    await newUser.save();
    await newUser.populate('role', 'name');

    await logAction(req, "CREATE_USER", "user", newUser._id, { username, email });
    return response.created(res, newUser, "User created successfully");
  } catch (error) {
    return response.serverError(res, "Failed to create user", error);
  }
};

/**
 * PUT /api/v1/users/:id
 * Admin: Update user
 */
const updateUser = async (req, res) => {
  try {
    const { fullName, phone, email, role, status } = req.body;
    const userId = req.params.id;

    const user = await userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) return response.notFound(res, "User not found");

    if (email && email !== user.email) {
      const emailExists = await userModel.findOne({ email, isDeleted: false, _id: { $ne: userId } });
      if (emailExists) return response.conflict(res, "Email already in use");
    }

    if (role) {
      const roleDoc = await roleModel.findOne({ _id: role, isDeleted: false });
      if (!roleDoc) return response.badRequest(res, "Invalid role ID");
    }

    const updated = await userModel.findByIdAndUpdate(
      userId,
      { fullName, phone, email, role, status },
      { new: true, runValidators: true }
    ).populate('role', 'name');

    await logAction(req, "UPDATE_USER", "user", userId, { fullName, phone, email, role, status });
    return response.success(res, updated, "User updated successfully");
  } catch (error) {
    return response.serverError(res, "Failed to update user", error);
  }
};

/**
 * PATCH /api/v1/users/:id/toggle-status
 * Admin: Lock/Unlock user account
 */
const toggleStatus = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) return response.notFound(res, "User not found");

    user.status = !user.status;
    await user.save();

    const action = user.status ? "UNLOCK_USER" : "LOCK_USER";
    await logAction(req, action, "user", user._id, { newStatus: user.status });

    return response.success(res, { _id: user._id, status: user.status },
      `User ${user.status ? 'unlocked' : 'locked'} successfully`
    );
  } catch (error) {
    return response.serverError(res, "Failed to toggle user status", error);
  }
};

/**
 * DELETE /api/v1/users/:id
 * Admin: Soft delete user
 */
const deleteUser = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) return response.notFound(res, "User not found");

    user.isDeleted = true;
    await user.save();

    await logAction(req, "DELETE_USER", "user", user._id, { username: user.username });
    return response.success(res, null, "User deleted successfully");
  } catch (error) {
    return response.serverError(res, "Failed to delete user", error);
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, toggleStatus, deleteUser };
