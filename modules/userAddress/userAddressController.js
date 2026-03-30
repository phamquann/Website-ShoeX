const response = require('../../middlewares/response');
const { logAction } = require('../../middlewares/auth');
const userAddressModel = require('../../schemas/userAddresses');

/**
 * GET /api/v1/user-addresses
 * Get all addresses for the logged-in user
 */
const getMyAddresses = async (req, res) => {
  try {
    const addresses = await userAddressModel.find({
      user: req.user._id,
      isDeleted: false
    }).sort({ isDefault: -1, createdAt: -1 });

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

    // Check if user has no addresses yet, make this one default automatically
    const count = await userAddressModel.countDocuments({ user: userId, isDeleted: false });
    const shouldBeDefault = count === 0 ? true : (isDefault || false);

    if (shouldBeDefault && count > 0) {
      // Unset previous default
      await userAddressModel.updateMany(
        { user: userId, isDeleted: false },
        { isDefault: false }
      );
    }

    const newAddress = new userAddressModel({
      user: userId,
      fullName,
      phone,
      province,
      district,
      ward,
      addressDetail,
      isDefault: shouldBeDefault
    });

    await newAddress.save();
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

    const address = await userAddressModel.findOne({
      _id: addressId,
      user: userId,
      isDeleted: false
    });

    if (!address) {
      return response.notFound(res, "Address not found");
    }

    if (isDefault && !address.isDefault) {
      // Unset previous default
      await userAddressModel.updateMany(
        { user: userId, isDeleted: false },
        { isDefault: false }
      );
    }

    address.fullName = fullName || address.fullName;
    address.phone = phone || address.phone;
    address.province = province || address.province;
    address.district = district || address.district;
    address.ward = ward || address.ward;
    address.addressDetail = addressDetail || address.addressDetail;
    
    // Only allow setting to true, prevent unsetting the only default without providing a new one
    if (isDefault) address.isDefault = true;

    await address.save();
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

    const address = await userAddressModel.findOne({
      _id: addressId,
      user: userId,
      isDeleted: false
    });

    if (!address) {
      return response.notFound(res, "Address not found");
    }

    address.isDeleted = true;
    await address.save();

    // If it was default, make the most recently modified address the new default
    if (address.isDefault) {
      const nextLatest = await userAddressModel.findOne({
        user: userId,
        isDeleted: false
      }).sort({ updatedAt: -1 });

      if (nextLatest) {
        nextLatest.isDefault = true;
        await nextLatest.save();
      }
    }

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
