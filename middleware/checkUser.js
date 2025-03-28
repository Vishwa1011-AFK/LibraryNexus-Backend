const jwt = require("jsonwebtoken");
require("dotenv").config();
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

const allowedPaths = [
  "/api/auth/signup",
  "/api/auth/signin",
  "/api/auth/forgot",
  "/api/auth/verify-reset",
  "/api/auth/signup-otp",
  "/api/auth/verify-signup",
  "/api/books",
  "/api/categories",
  "/api/authors",
];

const isPathAllowed = (path) => {
  const lowerCasePath = path.toLowerCase();
  if (allowedPaths.includes(lowerCasePath)) return true;
  if (/^\/api\/books\/[a-f0-9]{24}$/i.test(lowerCasePath)) return true;
    return false;
}

async function checkUser(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }

  if (isPathAllowed(req.path)) {
    return next();
  }

  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  try {
    const decoded = jwt.verify(token, refreshTokenSecret);

    const userExists = await User.findById(decoded.user_id);
    if (!userExists) {
      res.clearCookie("refreshToken");
      return res.status(401).json({ error: "Unauthorized - User not found" });
    }

    req.user = decoded;
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
        res.clearCookie("refreshToken");
        return res.status(401).json({ error: "Unauthorized - Token expired" });
    }
    if (err.name === 'JsonWebTokenError') {
        res.clearCookie("refreshToken");
        return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
}

module.exports = checkUser;
