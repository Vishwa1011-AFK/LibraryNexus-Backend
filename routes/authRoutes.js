const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");
const otpMailAndVerificationController = require("../controllers/otpMailAndVerificationController");

router.post("/signup", UserController.signup);
router.post("/signin", UserController.signin);
router.post("/token", UserController.createAccessToken);
router.post("/logout", UserController.logout);

router.post("/signup-otp",otpMailAndVerificationController.initiateOTPVerification);
router.post("/forgot", otpMailAndVerificationController.initiateForgotPassword);
router.post("/verify", otpMailAndVerificationController.verifyOTP);
router.post("/change_password", UserController.changePassword);

router.get("/me", UserController.getCurrentUser);
router.patch("/me", UserController.updateCurrentUserProfile);
router.put("/me/password", UserController.changeCurrentUserPassword);

router.get("/details/:id", UserController.findUserById);

module.exports = router;
