const response = require('../../middlewares/response');
const notificationModel = require('../../schemas/notifications');

/**
 * GET /api/v1/notifications
 * Get logged-in user's notifications
 */
const getMyNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      notificationModel.find({ user: req.user._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      notificationModel.countDocuments({ user: req.user._id, isDeleted: false }),
      notificationModel.countDocuments({ user: req.user._id, isRead: false, isDeleted: false })
    ]);

    return response.success(res, notifications, "Notifications retrieved successfully", 200, {
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return response.serverError(res, "Failed to get notifications", error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const notif = await notificationModel.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isDeleted: false },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notif) return response.notFound(res, "Notification not found");

    return response.success(res, notif, "Notification marked as read");
  } catch (error) {
    return response.serverError(res, "Failed to mark notification as read", error);
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all user's notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    await notificationModel.updateMany(
      { user: req.user._id, isRead: false, isDeleted: false },
      { isRead: true, readAt: new Date() }
    );

    return response.success(res, null, "All notifications marked as read");
  } catch (error) {
    return response.serverError(res, "Failed to mark all notifications as read", error);
  }
};

/**
 * POST /api/v1/notifications/system (Admin only)
 * Send a manual notification to a user or all users
 */
const pushSystemNotification = async (req, res) => {
  try {
    const { title, message, targetUserId } = req.body;

    if (!title || !message) {
      return response.badRequest(res, "Title and message are required");
    }

    if (targetUserId === 'all') {
      const userModel = require('../../schemas/users');
      const allUsers = await userModel.find({ isDeleted: false, status: true }).select('_id');
      
      const bulkOps = allUsers.map(user => ({
        insertOne: {
          document: { user: user._id, title, message, type: 'system' }
        }
      }));

      await notificationModel.bulkWrite(bulkOps);
      return response.success(res, null, `Notification pushed to ${allUsers.length} users`);
      
    } else {
      const newNotif = new notificationModel({
        user: targetUserId,
        title,
        message,
        type: 'system'
      });
      await newNotif.save();
      return response.success(res, newNotif, "Notification pushed to targeted user");
    }
  } catch (error) {
    return response.serverError(res, "Failed to push notification", error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  pushSystemNotification
};
