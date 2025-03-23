const mongoose = require("mongoose");

const WishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
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
