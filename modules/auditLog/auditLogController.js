const response = require('../../middlewares/response');
const auditLogModel = require('../../schemas/auditLogs');

/**
 * GET /api/v1/audit-logs
 * Fetch audit logs (Admin only) with pagination and optional filtering
 */
const getLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { action, resource, userId, status } = req.query;

    const query = {};
    if (action) query.action = { $regex: action, $options: 'i' };
    if (resource) query.resource = { $regex: resource, $options: 'i' };
    if (userId) query.user = userId;
    if (status) query.status = status;

    const [logs, total] = await Promise.all([
      auditLogModel.find(query)
        .populate('user', 'username email fullName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      auditLogModel.countDocuments(query)
    ]);

    return response.success(res, logs, "Audit logs retrieved successfully", 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return response.serverError(res, "Failed to get audit logs", error);
  }
};

module.exports = { getLogs };
