const express = require("express");
const router = express.Router();
const WishlistController = require("../controllers/wishlistController");

router.get("/", WishlistController.getWishlist);
router.post("/:userId", WishlistController.addBookToWishlist);
router.delete("/:userId/:isbn", WishlistController.removeBookFromWishlist);

module.exports = router;
