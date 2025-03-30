const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");
const verifyAccessToken = require('../middleware/verifyAccessToken');

router.use(verifyAccessToken);

router.get("/me", UserController.getCurrentUser);
router.patch("/me", UserController.updateCurrentUserProfile);
router.put("/me/password", UserController.changeCurrentUserPassword);
router.get("/me/borrowed-books", UserController.getCurrentUserBorrowedBooks);
router.get("/me/reading-history", UserController.getCurrentUserReadingHistory);

module.exports = router;
