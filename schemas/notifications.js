const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true
    },
    type: {
      type: String,
      enum: ["order", "promotion", "system", "other"],
      default: "system"
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
      // could reference order, product, etc.
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

module.exports = mongoose.model("notification", notificationSchema);
