const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null
    },
    action: {
      type: String,
      required: true,
      trim: true
      // e.g. "LOGIN", "REGISTER", "CREATE_PRODUCT", "DELETE_ORDER", "UPDATE_USER"
    },
    resource: {
      type: String,
      required: true,
      trim: true
      // e.g. "user", "product", "order"
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    detail: {
      type: mongoose.Schema.Types.Mixed,
      default: null
      // store extra info: { old: {...}, new: {...} }
    },
    ipAddress: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("auditLog", auditLogSchema);
