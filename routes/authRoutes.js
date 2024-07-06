const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");
const otpMailAndVerificationController = require("../controllers/otpMailAndVerificationController");

router.post("/signup", UserController.signup);
router.post("/signin", UserController.signin);
router.get("/details/:id", UserController.findUserById);
router.post(
  "/signup-otp",
  otpMailAndVerificationController.initiateOTPVerification
);
router.post("/forgot", otpMailAndVerificationController.initiateForgotPassword);
router.post("/verify", otpMailAndVerificationController.verifyOTP);
router.patch("/profile/:id", UserController.updateUserProfile);
router.post("/change_password", UserController.changePassword);
router.post("/token", UserController.createAccessToken);
router.post("/logout", UserController.logout);

module.exports = router;
