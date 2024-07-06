const mongoose = require("mongoose");

const WishlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  books: [
    {
      isbn: { type: String, required: true },
      author: { type: String, required: true },
      title: { type: String, required: true },
      addedAt: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("Wishlist", WishlistSchema);
