const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true] },
    middleName: { type: String },
    lastName: { type: String, required: [true] },
    email: { type: String, required: [true] },
    email_verified: { type: Boolean, default: false },
    password: { type: String, required: [true] },
    birthDate: { type: Date },
    otp: { type: String },
    otpExpiry: { type: Date },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
  },
  {
    collection: "UserInfo",
  }
);

var User = mongoose.model("User", UserSchema);

module.exports = User;
