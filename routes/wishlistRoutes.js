const express = require("express");
const router = express.Router();
const WishlistController = require("../controllers/wishlistController");
const verifyAccessToken = require('../middleware/verifyAccessToken'); 

router.use(verifyAccessToken); 

router.get("/me", WishlistController.getWishlist);
router.post("/me/:bookId", WishlistController.addBookToWishlist);
router.delete("/me/:bookId", WishlistController.removeBookFromWishlist);

module.exports = router;
