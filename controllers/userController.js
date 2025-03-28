const User = require("../models/Users");
const RefreshToken = require("../models/RefreshToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const emailVerify = require("../services/emailValidator");
const mongoose = require("mongoose");
const { userSchema } = require("../types");
const { findUserById } = require("../services/userService");
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
const { findUserById, findUserByEmail } = require("../services/userService");

require("dotenv").config();


async function userExists(email, password) {
  const existingUser = await User.findOne({ email });
  if (!existingUser) return false;
  const valid = await bcrypt.compare(password, existingUser.password);
  return valid;
}

module.exports = {
  async signup(req, res) {
    const validatedData = userSchema.parse({
      ...req.body,
      user_id: new mongoose.Types.ObjectId(),
    });

    const isEmailValid = emailVerify.validateEmail(validatedData.email);
    if (!isEmailValid.valid) {
      return res.status(400).json({ message: isEmailValid.message });
    }

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) return res.status(400).send("Username/Email Already Exists!");

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    const user = new User({
      user_id: validatedData.user_id,
      firstName: validatedData.firstName,
      middleName: validatedData.middleName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      password: hashedPassword,
      birthDate: validatedData.birthDate,
    });

    try {
      await user.save();
      res.status(201).json({ msg: "User successfully created." });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  },

  async signin(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    if (!(await userExists(email, password))) {
      return res.status(403).json({ msg: "User doesn't exist in our database" });
    }
    const existingUser = await User.findOne({ email });

    const tokenPayload = {
      user_id: existingUser._id,
      role: existingUser.role,
    };

    const userDetails = {
      firstName: existingUser.firstName,
      middleName: existingUser.middleName,
      lastName: existingUser.lastName,
      email: existingUser.email,
      birthDate: existingUser.birthDate,
    };

    const accessToken = jwt.sign(tokenPayload, accessTokenSecret, { expiresIn: "15m" });
    const refreshToken = jwt.sign(tokenPayload, refreshTokenSecret, { expiresIn: "30d" });

    await RefreshToken.create({
      token: refreshToken,
      user: existingUser._id,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true });

    return res.json({
      accessToken: accessToken,
      msg: "Login Successful",
      user: tokenPayload,
      userdetails: userDetails,
    });
  },

  async findUserById(req, res) {
    try {
      const user = await findUserById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, otp, otpExpiry, __v, ...userData } = user.toObject();
      res.json(userData);
    } catch (error) {
      console.error("Error finding user by ID:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async getCurrentUser(req, res) {
    try {
      if (!req.user || !req.user.user_id) {
        return res.status(401).json({ message: "Authentication required." });
      }

      const userId = req.user.user_id;
      const user = await findUserById(userId); 

      if (!user) {
        return res.status(404).json({ message: "User not found for token." });
      }

      res.json({
        id: user._id, 
        user_id: user.user_id, 
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        email_verified: user.email_verified,
        birthDate: user.birthDate,
        role: user.role,
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async updateCurrentUserProfile(req, res) {
    try {
      const userId = req.user.user_id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const updateData = req.body;
      const user = await findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
      if (updateData.middleName !== undefined) user.middleName = updateData.middleName;
      if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
      if (updateData.birthDate !== undefined) {
        user.birthDate = new Date(updateData.birthDate);
        if (isNaN(user.birthDate.getTime())) {
          return res.status(400).json({ error: "Invalid birthDate format." });
        }
      }

      await user.save();
      const { password, otp, otpExpiry, __v, ...userData } = user.toObject();
      res.json({ user: userData, message: "Profile updated successfully" });

    } catch (error) {
      console.error("Error updating current user profile:", error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ error: "Validation Error", details: error.message });
      }
      res.status(500).json({ message: "An error occurred while updating the profile" });
    }
  },

  async createAccessToken(req, res) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401);

    const refreshTokenDoc = await RefreshToken.findOne({ token: refreshToken }).populate('user');
    if (!refreshTokenDoc) return res.sendStatus(403);

    if (refreshTokenDoc.expiryDate < new Date()) {
      await RefreshToken.findByIdAndDelete(refreshTokenDoc._id);
      return res.status(401).json({ error: "Token Expired" });
    }

    jwt.verify(refreshToken, refreshTokenSecret, (err, user) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ error: "Token Expired" });
        } else {
          return res.sendStatus(403);
        }
      }
      const newAccessToken = jwt.sign(
        { user_id: user._id, role: user.role },
        accessTokenSecret,
        { expiresIn: "15m" }
      );
      res.json({ accessToken: newAccessToken });
    });
  },

  async logout(req, res) {
    const refreshToken = req.cookies.refreshToken;
    await RefreshToken.findOneAndDelete({ token: refreshToken });
    res.clearCookie("refreshToken");
    res.sendStatus(204);
  },

  async changeCurrentUserPassword(req, res) {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both currentPassword and newPassword are required." });
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid current password." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();
      await RefreshToken.deleteMany({ user: userId });

      res.clearCookie("refreshToken");
      res.status(200).json({ message: "Password changed successfully. Please log in again." });

    } catch (error) {
      console.error("Error changing current user password:", error);
      res.status(500).json({ error: "Internal server error changing password." });
    }
  },
};