const response = require('../../middlewares/response');
const notificationModel = require('../../schemas/notifications');
const userModel = require('../../schemas/users');
const { registerClient } = require('../../utils/notificationSse');
const { notifyUsers, notifyUser } = require('../../utils/notificationHelper');

/**
 * GET /api/v1/notifications/stream
 * Register notification SSE stream for current user
 */
const stream = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  res.write('retry: 10000\n');
  res.write(`event: connected\ndata: ${JSON.stringify({ connected: true, ts: Date.now() })}\n\n`);

  registerClient(req.user._id, res);
};

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
      const allUsers = await userModel.find({ isDeleted: false, status: true }).select('_id');

      await notifyUsers(
        allUsers.map((user) => user._id),
        { title, message, type: 'system' }
      );
      return response.success(res, null, `Notification pushed to ${allUsers.length} users`);

    } else {
      await notifyUser(targetUserId, { title, message, type: 'system' });
      return response.success(res, null, "Notification pushed to targeted user");
    }
  } catch (error) {
    return response.serverError(res, "Failed to push notification", error);
  }
};

module.exports = {
  stream,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  pushSystemNotification
};
