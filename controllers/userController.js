const User = require("../models/Users");
const RefreshToken = require("../models/RefreshToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const emailVerify = require("../services/emailValidator");
const mongoose = require("mongoose");
const { userSchema } = require("../types");
require("dotenv").config();
const { findUserById } = require("../services/userService");
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

async function userExists(email, password) {
  let userExist = false;

  const existingUser = await User.findOne({ email });
  if (!existingUser) return false;
  async function validate(password) {
    var valid = false;
    valid = await bcrypt.compare(password, existingUser.password);
    return valid;
  }

  if (existingUser && (await validate(password))) {
    userExist = true;
  }

  return userExist;
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

    if (isEmailValid) {
      const existingUser = await User.findOne({ email: validatedData.email });

      if (existingUser) {
        return res.status(400).send("Username/Email Already Exists!");
      }

      const user = new User({
        user_id: validatedData.user_id,
        firstName: validatedData.firstName,
        middleName: validatedData.middleName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        password: validatedData.password,
        birthDate: validatedData.birthDate,
      });

      try {
        await user.save();
        res.status(201).json({
          msg: "User successfully created.",
        });
      } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
      }
    } else {
      return res
        .status(400)
        .send("Invalid Email Address, Please enter a valid email address.");
    }
  },

  async signin(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    if (!(await userExists(email, password))) {
      return res.status(403).json({
        msg: "User doesnt exist in our in memory db",
      });
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

    const accessToken = jwt.sign(tokenPayload, accessTokenSecret, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(tokenPayload, refreshTokenSecret, {
      expiresIn: "30d",
    });

    let newRefreshToken = await RefreshToken.create({
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
      const user = await User.findOne({ _id: req.params.id });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error finding user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async updateUserProfile(req, res) {
    try {
      const { id } = req.params;
      const validatedData = req.body;

      const user = await findUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (validatedData.firstName) {
        user.firstName = validatedData.firstName;
      }
      if (validatedData.middleName) {
        user.middleName = validatedData.middleName;
      }
      if (validatedData.lastName) {
        user.lastName = validatedData.lastName;
      }
      if (validatedData.birthDate) {
        user.birthDate = validatedData.birthDate;
      }

      await user.save();

      res.json({ user, message: "Profile updated successfully" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while updating the profile" });
    }
  },

  async createAccessToken(req, res) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401);
    const refreshTokenDoc = await RefreshToken.findOne({ token: refreshToken }).populate('user');
    if (!refreshTokenDoc) {
        return res.sendStatus(403);
    }

    if (refreshTokenDoc.expiryDate < new Date()) {
        await RefreshToken.findByIdAndDelete(refreshTokenDoc._id);
        return res.status(401).json({ error: "Token Expired" });
    }

    jwt.verify(refreshToken, refreshTokenSecret, (err, user) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          logout(req, res);
          return res.sendStatus(401).json({ error: "Token Expired" });
        } else {
          return res.sendStatus(403);
        }
      }
      const newAccessToken = jwt.sign(
        { username: user._id, role: user.role },
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

  async changePassword(req, res) {
    const { userId, currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid current password." });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();
      res.status(200).json({ message: "Password changed successfully." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error." });
    }
  },
};
