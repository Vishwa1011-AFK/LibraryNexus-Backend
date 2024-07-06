require("dotenv").config();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const appEmail = process.env.APP_EMAIL;
const appPassword = process.env.APP_PASSWORD;

function generateOTP() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function sendOTPEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "localhost:3000",
    port: 465,
    secure: true,
    auth: {
      user: appEmail,
      pass: appPassword,
    },
  });

  const mailOptions = {
    from: appEmail,
    to: email,
    subject: "Forgot Password OTP",
    text: `Your OTP for password reset is: ${otp}`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error("Failed to send OTP:", error);
    } else {
      console.log("OTP sent successfully:", info.response);
    }
  });
}

module.exports = { generateOTP, sendOTPEmail };
