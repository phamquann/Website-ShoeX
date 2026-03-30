const mongoose = require("mongoose");

const userAddressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },
    province: {
      type: String,
      required: [true, "Province is required"],
      trim: true
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true
    },
    ward: {
      type: String,
      required: [true, "Ward is required"],
      trim: true
    },
    addressDetail: {
      type: String,
      required: [true, "Address detail is required"],
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("userAddress", userAddressSchema);
