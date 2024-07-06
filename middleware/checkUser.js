const jwt = require("jsonwebtoken");
require("dotenv").config();
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

const allowedPaths = [
  "/api/auth/signup",
  "/api/auth/signin",
  "/api/auth/forgot",
  "/api/auth/verify",
  "/api/auth/signup-otp",
];

function checkUser(req, res, next) {
  if (
    req.method === "OPTIONS" ||
    allowedPaths.includes(req.path.toLowerCase())
  ) {
    return next();
  }

  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  jwt.verify(token, refreshTokenSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }
    req.user = decoded;
    next();
  });
}
module.exports = checkUser;
