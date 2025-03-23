const express = require("express");
const router = express.Router();
const WishlistController = require("../controllers/wishlistController");

router.post("/", WishlistController.getWishlist);
router.post("/:userId", WishlistController.addBookToWishlist);
router.post("/:userId/:isbn", WishlistController.removeBookFromWishlist);

module.exports = router;
