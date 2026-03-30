const mongoose = require("mongoose");
let bcrypt = require('bcrypt');

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