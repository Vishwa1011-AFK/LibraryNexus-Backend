const User = require("../models/Users");
const mongoose = require("mongoose");

async function findUserByEmail(email) {
  try {
    const user = await User.findOne({ email });
    return user;
  } catch (error) {
    console.error("Error finding user:", error);
    throw error;
  }
}

async function findUserById(user_id) {
  try {
    const objectId = new mongoose.Types.ObjectId(user_id);
    const user = await User.findOne({ _id: objectId });
    return user;
  } catch (error) {
    console.error("Error finding user:", error);
    throw error;
  }
}

async function findMailById(user_id) {
  try {
    const email = await User.findOne(user_id).email;
    return email;
  } catch (error) {
    console.error("Error finding email:", error);
    throw error;
  }
}

async function verifyOTP(email, otp) {
  try {
    const user = await User.findOne({ email, otp });
    return user;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
  }
}

module.exports = {
  findUserByEmail,
  verifyOTP,
  findUserById,
  findMailById,
};
