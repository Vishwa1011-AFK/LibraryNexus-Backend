const mongoose = require("mongoose");

const WishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    unique: true,
    index: true
  },
  books: [
    {
      bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
      },
      addedAt: {
         type: Date,
         default: Date.now
      }
    }
  ],
});

WishlistSchema.index({ userId: 1, 'books.bookId': 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", WishlistSchema);
