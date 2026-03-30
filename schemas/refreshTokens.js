const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    isRevoked: {
      type: Boolean,
      default: false
    },
    userAgent: {
      type: String,
      default: ""
    },
    ipAddress: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Auto-delete expired tokens via TTL index
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("refreshToken", refreshTokenSchema);
