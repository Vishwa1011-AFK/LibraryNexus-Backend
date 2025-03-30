const jwt = require("jsonwebtoken");
const User = require("../models/Users");
require("dotenv").config();
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

async function verifyAccessToken(req, res, next) {
    if (req.method === "OPTIONS") {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized - No token provided or invalid format" });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    try {
        const decoded = jwt.verify(token, accessTokenSecret);
        req.user = decoded;
        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Unauthorized - Access Token expired" });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Unauthorized - Invalid Access Token" });
        }
        console.error("Access Token Verification Error:", err);
        return res.status(500).json({ error: "Internal server error during authentication" });
    }
}

module.exports = verifyAccessToken;