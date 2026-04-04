const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Permission name is required"],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    resource: {
      type: String,
      required: [true, "Resource is required"],
      trim: true
    },
    action: {
      type: String,
      enum: ["create", "read", "update", "delete", "manage"],
      required: true
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

module.exports = mongoose.model("permission", permissionSchema);
