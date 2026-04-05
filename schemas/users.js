const mongoose = require("mongoose");
let bcrypt = require('bcrypt');

const userRefreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' }
  },
  {
    _id: true,
    timestamps: true
  }
);

const userAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    ward: { type: String, required: true, trim: true },
    addressDetail: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  },
  {
    _id: true,
    timestamps: true
  }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true
    },

    password: {
      type: String,
      required: [true, "Password is required"]
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true
    },

    fullName: {
      type: String,
      default: "",
      trim: true
    },

    phone: {
      type: String,
      default: "",
      trim: true
    },

    avatarUrl: {
      type: String,
      default: "https://i.sstatic.net/l60Hf.png"
    },

    status: {
      type: Boolean,
      default: true   // true = active, false = locked
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "role",
      required: true
    },

    loginCount: {
      type: Number,
      default: 0,
      min: [0, "Login count cannot be negative"]
    },
    lockTime: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    forgotPasswordToken: {
      type: String,
      default: null
    },
    forgotPasswordTokenExp: {
      type: Date,
      default: null
    },
    refreshTokens: {
      type: [userRefreshTokenSchema],
      default: []
    },
    addresses: {
      type: [userAddressSchema],
      default: []
    },
    wishlist: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
      default: []
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', function () {
  if (this.isModified('password')) {
    let salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
  }
});

module.exports = mongoose.model("user", userSchema);