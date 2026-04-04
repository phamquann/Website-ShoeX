const mongoose = require("mongoose");

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

module.exports = mongoose.model("role", roleSchema);