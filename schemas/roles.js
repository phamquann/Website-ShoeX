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

const permissionModel = mongoose.models.permission || mongoose.model("permission", permissionSchema);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      uppercase: true
      // e.g. "ADMIN", "STAFF", "CUSTOMER"
    },
    description: {
      type: String,
      default: ""
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "permission"
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const roleModel = mongoose.models.role || mongoose.model("role", roleSchema);

module.exports = roleModel;
module.exports.Permission = permissionModel;