const User = require("../models/Users");
const RefreshToken = require("../models/RefreshToken");
const Loan = require("../models/Loan");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const emailVerify = require("../services/emailValidator");
const mongoose = require("mongoose");
const { userSchema } = require("../types");
const { findUserById } = require("../services/userService");
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
const adminSignupCode = process.env.ADMIN_SIGNUP_CODE;

require("dotenv").config();


async function userExists(email, password) {
  const existingUser = await User.findOne({ email });
  if (!existingUser) return { exists: false, user: null };
  const valid = await bcrypt.compare(password, existingUser.password);
  return { exists: valid, user: existingUser };
}

module.exports = {
  async signup(req, res) {
    let validatedData;
    try {
      validatedData = userSchema.parse({
        ...req.body,
        adminCode: req.body.adminCode
      });
    } catch (e) {
      return res.status(400).json({ message: "Validation failed", errors: e.errors });
    }

    const isEmailValid = emailVerify.validateEmail(validatedData.email);
    if (!isEmailValid.valid) {
      return res.status(400).json({ message: isEmailValid.message });
    }

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) return res.status(400).json({ msg: "Username/Email Already Exists!" });

    let userRole = "student";
    if (validatedData.adminCode && adminSignupCode && validatedData.adminCode === adminSignupCode) {
      userRole = "admin";
      console.log(`Admin code matched for ${validatedData.email}. Setting role to admin.`);
    } else if (validatedData.adminCode) {
        console.log(`Admin code provided for ${validatedData.email} but did not match.`);
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    const user = new User({
      firstName: validatedData.firstName,
      middleName: validatedData.middleName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      password: hashedPassword,
      birthDate: validatedData.birthDate,
      role: userRole,
    });

    try {
      await user.save();
      res.status(201).json({ msg: "User successfully created." });
    } catch (err) {
      console.error("Error saving user:", err);
       if (err.code === 11000) {
           return res.status(400).json({ msg: "Username/Email Already Exists!" });
       }
      res.status(500).json({ msg: "Server error during user creation" });
    }
  },

  async signin(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    const { exists, user: existingUser } = await userExists(email, password);

    if (!exists || !existingUser) {
      return res.status(403).json({ msg: "Invalid email or password" });
    }

    const tokenPayload = {
      user_id: existingUser._id,
      role: existingUser.role,
    };

    const userDetails = {
      id: existingUser._id,
      firstName: existingUser.firstName,
      middleName: existingUser.middleName,
      lastName: existingUser.lastName,
      email: existingUser.email,
      birthDate: existingUser.birthDate,
      role: existingUser.role,
      email_verified: existingUser.email_verified,
    };

    const accessToken = jwt.sign(tokenPayload, accessTokenSecret, { expiresIn: "15m" });
    const refreshToken = jwt.sign(tokenPayload, refreshTokenSecret, { expiresIn: "30d" });

    try {
        await RefreshToken.create({
            token: refreshToken,
            user: existingUser._id,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        const cookieOptions = {
            httpOnly: true,
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax'
        };
        res.cookie("refreshToken", refreshToken, cookieOptions);

        return res.json({
            accessToken: accessToken,
            msg: "Login Successful",
            user: {
                id: existingUser._id.toString(),
                role: existingUser.role,
                firstName: existingUser.firstName,
                lastName: existingUser.lastName,
                email: existingUser.email,
                email_verified: existingUser.email_verified,
            },
             userdetails: userDetails
        });

    } catch (dbError) {
         console.error("Error saving refresh token:", dbError);
         return res.status(500).json({ msg: "Login failed due to server error." });
    }
  },

   async findUserById(req, res) {
    try {
      const user = await findUserById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, otp, otpExpiry, __v, ...userData } = user.toObject();
      res.json({ ...userData, id: userData._id });
    } catch (error) {
      console.error("Error finding user by ID:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async getCurrentUser(req, res) {
    try {
      if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: "Authentication required." });
      }

      const userId = req.user.user_id;
      const user = await findUserById(userId);

      if (!user) {
         console.warn(`User ID ${userId} from token not found in DB.`);
        return res.status(404).json({ error: "User not found for token." });
      }

      res.json({
        id: user._id.toString(),
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        email_verified: user.email_verified,
        birthDate: user.birthDate,
        role: user.role,
        isAdmin: user.role === 'admin',
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateCurrentUserProfile(req, res) {
    try {
      const userId = req.user.user_id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const updateData = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      let hasChanges = false;
      if (updateData.firstName !== undefined && updateData.firstName !== user.firstName) {
          user.firstName = updateData.firstName;
          hasChanges = true;
      }
      if (updateData.middleName !== undefined && updateData.middleName !== user.middleName) {
          user.middleName = updateData.middleName || '';
          hasChanges = true;
        }
      if (updateData.lastName !== undefined && updateData.lastName !== user.lastName) {
          user.lastName = updateData.lastName;
          hasChanges = true;
        }
      if (updateData.birthDate !== undefined) {
          try {
              const newDate = new Date(updateData.birthDate);
              if (isNaN(newDate.getTime())) {
                  return res.status(400).json({ error: "Invalid birthDate format." });
              }
               const existingDate = user.birthDate ? new Date(user.birthDate) : null;
               if (!existingDate || newDate.toISOString().split('T')[0] !== existingDate.toISOString().split('T')[0]) {
                  user.birthDate = newDate;
                  hasChanges = true;
               }
          } catch (e) {
               return res.status(400).json({ error: "Invalid birthDate value." });
          }
      }

      if (!hasChanges) {
          return res.status(200).json({ message: "No changes detected." });
      }

      await user.save();
      const { password, otp, otpExpiry, __v, ...userData } = user.toObject();
      const responseUser = {
          ...userData,
          id: userData._id.toString(),
          isAdmin: userData.role === 'admin'
      };
      res.json({ user: responseUser, message: "Profile updated successfully" });

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

    if (!refreshToken) {
        console.log("Refresh token request received, but no token found in cookies.");
        return res.status(401).json({ error: "Refresh token missing." });
     }

    try {
        const refreshTokenDoc = await RefreshToken.findOne({ token: refreshToken });

        if (!refreshTokenDoc) {
             console.log(`Refresh token received (${refreshToken.substring(0,10)}...) but not found in DB.`);
             res.clearCookie("refreshToken");
             return res.status(403).json({ error: "Invalid refresh token." });
        }

        if (refreshTokenDoc.expiryDate < new Date()) {
            console.log(`Refresh token (${refreshToken.substring(0,10)}...) found but expired.`);
            await RefreshToken.findByIdAndDelete(refreshTokenDoc._id);
            res.clearCookie("refreshToken");
            return res.status(401).json({ error: "Refresh token expired." });
        }

        jwt.verify(refreshToken, refreshTokenSecret, (err, decodedPayload) => {
            if (err) {
                console.error("Refresh token verification failed:", err.name);
                 if (err.name === 'TokenExpiredError') {
                     return res.status(401).json({ error: "Refresh token expired (JWT verification)." });
                 }
                 return res.status(403).json({ error: "Invalid refresh token signature." });
            }

             if (!decodedPayload || !decodedPayload.user_id || decodedPayload.user_id !== refreshTokenDoc.user.toString()) {
                 console.error("Refresh token payload mismatch or missing user_id.");
                 return res.status(403).json({ error: "Token payload mismatch." });
             }

            const newAccessTokenPayload = {
                user_id: decodedPayload.user_id,
                role: decodedPayload.role
            };

            if (!newAccessTokenPayload.role) {
                 console.warn("Role missing in refresh token payload, cannot include in access token.");
            }


            const newAccessToken = jwt.sign(
                newAccessTokenPayload,
                accessTokenSecret,
                { expiresIn: "15m" }
            );

            console.log(`Access token refreshed for user ${decodedPayload.user_id}`);
            res.json({ accessToken: newAccessToken });
        });

    } catch (dbError) {
        console.error("Database error during token refresh:", dbError);
        res.status(500).json({ error: "Server error during token refresh." });
    }
  },

  async logout(req, res) {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        try {
            await RefreshToken.findOneAndDelete({ token: refreshToken });
        } catch (err) {
             console.error("Error deleting refresh token during logout:", err);
        }
    }
    res.clearCookie("refreshToken", { path: '/' });
    res.status(204).send();
  },

  async changeCurrentUserPassword(req, res) {
    const userId = req.user?.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both currentPassword and newPassword are required." });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters." });
    }
    if (currentPassword === newPassword) {
         return res.status(400).json({ error: "New password cannot be the same as the current password." });
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

      res.clearCookie("refreshToken", { path: '/' });
      res.status(200).json({ message: "Password changed successfully. Please log in again." });

    } catch (error) {
      console.error("Error changing current user password:", error);
      res.status(500).json({ error: "Internal server error changing password." });
    }
  },
  async getCurrentUserBorrowedBooks(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return res.status(401).json({ msg: "Authentication required" });
      const { search } = req.query;
      const query = { user: userId, returned: false };
      const populateOptions = {
        path: "book",
        select: "title author isbn cover category publishDate location pages language publisher",
      };
      if (search) {
        const searchRegex = new RegExp(search, "i");
        populateOptions.match = {
          $or: [
            { title: searchRegex },
            { author: searchRegex },
            { isbn: searchRegex },
            { category: searchRegex },
          ],
        };
      }
      let loans = await Loan.find(query).populate(populateOptions).sort({ issueDate: -1 }).lean();

      if (search) loans = loans.filter((loan) => loan.book !== null);

      const borrowedBooks = loans.map((loan) => ({
        loanId: loan._id,
        book: loan.book
          ? {
              id: loan.book._id,
              title: loan.book.title,
              author: loan.book.author,
              isbn: loan.book.isbn,
              coverUrl: loan.book.cover,
              category: loan.book.category,
              location: loan.book.location,
              pages: loan.book.pages,
              language: loan.book.language,
              publisher: loan.book.publisher,
              publishDate: loan.book.publishDate,
            }
          : null,
        issueDate: loan.issueDate,
        dueDate: loan.returnDate,
      }));
      res.json(borrowedBooks);
    } catch (error) {
      console.error("Error fetching borrowed books:", error);
      res.status(500).json({ msg: "Internal server error fetching borrowed books" });
    }
  },
  async getCurrentUserReadingHistory(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) return res.status(401).json({ msg: "Authentication required" });
      const { search } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const baseQuery = { user: userId, returned: true };

      const populateOptions = {
        path: "book",
        select: "title author isbn cover category",
      };

      let matchQuery = {};
      if (search) {
          const searchRegex = new RegExp(search, 'i');
           matchQuery = {
                $or: [
                    { 'book.title': searchRegex },
                    { 'book.author': searchRegex },
                    { 'book.isbn': searchRegex },
                    { 'book.category': searchRegex },
                ],
           };
       }

       const pipeline = [
           { $match: baseQuery },
           { $sort: { actualReturnDate: -1 } },
           {
                $lookup: {
                   from: 'books',
                   localField: 'book',
                   foreignField: '_id',
                   as: 'bookInfo'
                }
           },
           { $unwind: { path: '$bookInfo', preserveNullAndEmptyArrays: true } },
           { $addFields: { book: '$bookInfo' } },
           { $match: matchQuery },
           {
                $facet: {
                    paginatedResults: [
                        { $skip: skip },
                        { $limit: limit },
                         { $project: { bookInfo: 0 } }
                    ],
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
           }
       ];

       const results = await Loan.aggregate(pipeline);

       const historyLoans = results[0].paginatedResults;
       const total = results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;


      const readingHistory = historyLoans.map((loan) => ({
        loanId: loan._id,
        book: loan.book
          ? {
              id: loan.book._id,
              title: loan.book.title,
              author: loan.book.author,
              isbn: loan.book.isbn,
              coverUrl: loan.book.cover,
              category: loan.book.category,
            }
          : null,
        issueDate: loan.issueDate,
        completedDate: loan.actualReturnDate || loan.returnDate,
      }));

      res.json({ history: readingHistory, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Error fetching reading history:", error);
      res.status(500).json({ msg: "Internal server error fetching reading history" });
    }
  },
};