const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const roleModel = require('../../schemas/roles');
const permissionModel = require('../../schemas/permissions');

/**
 * ROLES
 */

const getRoles = async (req, res) => {
  try {
    const roles = await roleModel.find({ isDeleted: false })
      .populate('permissions', 'name resource action')
      .sort({ createdAt: 1 });
    
    return response.success(res, roles, "Roles retrieved successfully");
  } catch (error) {
    return response.serverError(res, "Failed to get roles", error);
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    const exists = await roleModel.findOne({ name: name.toUpperCase(), isDeleted: false });
    if (exists) return response.conflict(res, "Role already exists");

    const role = new roleModel({
      name: name.toUpperCase(),
      description,
      permissions: permissions || []
    });

    await role.save();
    await logAction(req, "CREATE_ROLE", "role", role._id, { name: role.name });

    return response.created(res, role, "Role created successfully");
  } catch (error) {
    return response.serverError(res, "Failed to create role", error);
  }
};

const assignPermissionsToRole = async (req, res) => {
  try {
    const { permissions } = req.body;
    const roleId = req.params.id;

    const role = await roleModel.findOne({ _id: roleId, isDeleted: false });
    if (!role) return response.notFound(res, "Role not found");

    if (role.name === 'ADMIN') {
      return response.badRequest(res, "cannot manually assign permissions to built-in ADMIN role");
    }

    role.permissions = permissions;
    await role.save();
    
    await logAction(req, "UPDATE_ROLE_PERMISSIONS", "role", role._id, { newPermissions: permissions });
    return response.success(res, role, "Permissions assigned to role successfully");
  } catch (error) {
    return response.serverError(res, "Failed to assign permissions to role", error);
  }
};

/**
 * PERMISSIONS
 */

const getPermissions = async (req, res) => {
  try {
    const perms = await permissionModel.find({ isDeleted: false }).sort({ resource: 1, action: 1 });
    return response.success(res, perms, "Permissions retrieved successfully");
  } catch (error) {
    return response.serverError(res, "Failed to get permissions", error);
  }
};

const createPermission = async (req, res) => {
  try {
    const { resource, action, description } = req.body;
    const name = `${action.toUpperCase()}_${resource.toUpperCase()}`;

    const exists = await permissionModel.findOne({ name, isDeleted: false });
    if (exists) return response.conflict(res, "Permission already exists");

    const perm = new permissionModel({ name, resource, action, description });
    await perm.save();
    
    return response.created(res, perm, "Permission created successfully");
  } catch (error) {
    return response.serverError(res, "Failed to create permission", error);
  }
};

module.exports = {
  getRoles,
  createRole,
  assignPermissionsToRole,
  getPermissions,
  createPermission
};
