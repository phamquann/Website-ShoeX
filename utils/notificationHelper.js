const notificationModel = require('../schemas/notifications');
const userModel = require('../schemas/users');
const roleModel = require('../schemas/roles');
const { broadcastNotifications } = require('./notificationSse');

const notifyUsers = async (userIds, payload) => {
  const normalizedUserIds = [...new Set((userIds || []).map(id => id?.toString()).filter(Boolean))];
  if (normalizedUserIds.length === 0) {
    return;
  }

  const documents = normalizedUserIds.map(userId => ({
    user: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    relatedId: payload.relatedId || null
  }));

  const inserted = await notificationModel.insertMany(documents);
  broadcastNotifications(inserted);
};

const notifyUser = async (userId, payload) => {
  if (!userId) {
    return;
  }

  await notifyUsers([userId], payload);
};

const notifyRoles = async (roleNames, payload) => {
  if (!roleNames || roleNames.length === 0) {
    return;
  }

  const roles = await roleModel.find({ name: { $in: roleNames } }).select('_id');
  if (roles.length === 0) {
    return;
  }

  const users = await userModel.find({
    role: { $in: roles.map(role => role._id) },
    isDeleted: false,
    status: true
  }).select('_id');

  await notifyUsers(users.map(user => user._id), payload);
};

module.exports = {
  notifyUser,
  notifyUsers,
  notifyRoles
};
