const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const userModel = require('../../schemas/users');

const sortActiveAddresses = (addresses = []) => {
  return addresses
    .filter((address) => !address.isDeleted)
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
};

const getUserAddressesDoc = async (userId) => {
  return userModel.findById(userId).select('addresses');
};

const findAddressById = (addresses = [], addressId) => {
  return addresses.find(
    (address) => address._id.toString() === addressId && !address.isDeleted
  ) || null;
};

/**
 * GET /api/v1/user-addresses
 * Get all addresses for the logged-in user
 */
const getMyAddresses = async (req, res) => {
  try {
    const user = await getUserAddressesDoc(req.user._id);
    if (!user) return response.notFound(res, 'User not found');

    const addresses = sortActiveAddresses(user.addresses || []);

    return response.success(res, addresses, "Addresses retrieved successfully");
  } catch (error) {
    return response.serverError(res, "Failed to get addresses", error);
  }
};

/**
 * POST /api/v1/user-addresses
 * Create new address
 */
const createAddress = async (req, res) => {
  try {
    const { fullName, phone, province, district, ward, addressDetail, isDefault } = req.body;
    const userId = req.user._id;

    const user = await getUserAddressesDoc(userId);
    if (!user) return response.notFound(res, 'User not found');

    // Check if user has no addresses yet, make this one default automatically
    const count = (user.addresses || []).filter((address) => !address.isDeleted).length;
    const shouldBeDefault = count === 0 ? true : (isDefault || false);

    if (shouldBeDefault && count > 0) {
      // Unset previous default
      user.addresses.forEach((address) => {
        if (!address.isDeleted) address.isDefault = false;
      });
    }

    user.addresses.push({
      fullName,
      phone,
      province,
      district,
      ward,
      addressDetail,
      isDefault: shouldBeDefault,
      isDeleted: false
    });

    const newAddress = user.addresses[user.addresses.length - 1];

    await user.save();

    await logAction(req, "CREATE_ADDRESS", "userAddress", newAddress._id);

    return response.created(res, newAddress, "Address created successfully");
  } catch (error) {
    return response.serverError(res, "Failed to create address", error);
  }
};

/**
 * PUT /api/v1/user-addresses/:id
 * Update an existing address
 */
const updateAddress = async (req, res) => {
  try {
    const { fullName, phone, province, district, ward, addressDetail, isDefault } = req.body;
    const addressId = req.params.id;
    const userId = req.user._id;

    const user = await getUserAddressesDoc(userId);
    if (!user) return response.notFound(res, 'User not found');

    const address = findAddressById(user.addresses || [], addressId);

    if (!address) {
      return response.notFound(res, "Address not found");
    }

    if (isDefault && !address.isDefault) {
      // Unset previous default
      user.addresses.forEach((item) => {
        if (!item.isDeleted) item.isDefault = false;
      });
    }

    address.fullName = fullName || address.fullName;
    address.phone = phone || address.phone;
    address.province = province || address.province;
    address.district = district || address.district;
    address.ward = ward || address.ward;
    address.addressDetail = addressDetail || address.addressDetail;
    
    // Only allow setting to true, prevent unsetting the only default without providing a new one
    if (isDefault) address.isDefault = true;

    const hasDefault = user.addresses.some((item) => !item.isDeleted && item.isDefault);
    if (!hasDefault) {
      const firstActive = user.addresses.find((item) => !item.isDeleted);
      if (firstActive) firstActive.isDefault = true;
    }

    await user.save();
    await logAction(req, "UPDATE_ADDRESS", "userAddress", address._id);

    return response.success(res, address, "Address updated successfully");
  } catch (error) {
    return response.serverError(res, "Failed to update address", error);
  }
};

/**
 * DELETE /api/v1/user-addresses/:id
 * Soft delete an address
 */
const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user._id;

    const user = await getUserAddressesDoc(userId);
    if (!user) return response.notFound(res, 'User not found');

    const address = findAddressById(user.addresses || [], addressId);

    if (!address) {
      return response.notFound(res, "Address not found");
    }

    address.isDeleted = true;
    address.isDefault = false;

    // If it was default, make the most recently modified address the new default
    const hasDefault = user.addresses.some((item) => !item.isDeleted && item.isDefault);
    if (!hasDefault) {
      const activeSorted = sortActiveAddresses(user.addresses || []);
      if (activeSorted.length > 0) {
        const target = user.addresses.find((item) => item._id.toString() === activeSorted[0]._id.toString());
        if (target) target.isDefault = true;
      }
    }

    await user.save();

    await logAction(req, "DELETE_ADDRESS", "userAddress", address._id);

    return response.success(res, null, "Address deleted successfully");
  } catch (error) {
    return response.serverError(res, "Failed to delete address", error);
  }
};

module.exports = {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress
};
