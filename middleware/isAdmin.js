const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden - Admins only" });
  }
  next();
};

module.exports = { isAdmin };
