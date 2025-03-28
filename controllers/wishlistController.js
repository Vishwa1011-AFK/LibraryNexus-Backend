const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Book = require("../models/Books");

module.exports = {
  async getWishlist(req, res) {
    try {
      const userId = req.user.user_id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { search } = req.query;

      let wishlist = await Wishlist.findOne({ userId: userId }).populate({path: 'books.bookId',select: 'title author isbn cover category'}).lean();

      if (!wishlist) {
        return res.json({ userId, books: [] });
      }

      if (search && wishlist.books) {
         wishlist.books = wishlist.books.filter(item => {
             if (!item.bookId) return false;
             const book = item.bookId;
             const regex = new RegExp(search, 'i');
             return regex.test(book.title) || regex.test(book.author) || regex.test(book.isbn);
         });
      }

      const formattedBooks = wishlist.books.map(item => ({
           ...(item.bookId ? {
               id: item.bookId._id,
               title: item.bookId.title,
               author: item.bookId.author,
               isbn: item.bookId.isbn,
               coverUrl: item.bookId.cover,
               category: item.bookId.category,
               addedAt: item.addedAt
           } : null)
       })).filter(book => book !== null);

      res.json({ userId: wishlist.userId, books: formattedBooks });

    } catch (err) {
      console.error("Error getting wishlist:", err);
      res.status(500).json({ error: "Internal server error getting wishlist" });
    }
  },

  async addBookToWishlist(req, res) {
    try {
        const userId = req.user.user_id;
        const { bookId } = req.params;

        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (!mongoose.Types.ObjectId.isValid(bookId)) {
            return res.status(400).json({ error: "Invalid Book ID format" });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        let wishlist = await Wishlist.findOne({ userId: userId });

        if (!wishlist) {
          wishlist = new Wishlist({ userId: userId, books: [] });
        }

        const alreadyExists = wishlist.books.some(item => item.bookId.equals(bookId));
        if (alreadyExists) {
          return res.status(400).json({ message: "Book already in wishlist" });
        }

        wishlist.books.push({ bookId: bookId });
        await wishlist.save();

        await wishlist.populate({
             path: 'books.bookId',
             select: 'title author isbn cover category'
        });

        const formattedBooks = wishlist.books.map(item => ({
           ...(item.bookId ? {
               id: item.bookId._id,
               title: item.bookId.title,
               author: item.bookId.author,
               isbn: item.bookId.isbn,
               coverUrl: item.bookId.cover,
               category: item.bookId.category,
               addedAt: item.addedAt
           } : null)
       })).filter(book => book !== null);

        res.status(201).json({ userId: wishlist.userId, books: formattedBooks });

    } catch (error) {
        console.error("Error adding book to wishlist:", error);
         if (error.code === 11000) {
            return res.status(400).json({ message: "Book already exists in wishlist (concurrent request?)" });
        }
        res.status(500).json({ error: "Internal server error adding book to wishlist" });
    }
  },

  async removeBookFromWishlist(req, res) {
    try {
        const userId = req.user.user_id;
        const { bookId } = req.params;

        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (!mongoose.Types.ObjectId.isValid(bookId)) {
            return res.status(400).json({ error: "Invalid Book ID format" });
        }

        const result = await Wishlist.updateOne(
            { userId: userId },
            { $pull: { books: { bookId: bookId } } }
        );

        if (result.matchedCount === 0) {
             return res.status(404).json({ error: "Wishlist not found for user" });
        }
         if (result.modifiedCount === 0) {
             return res.status(404).json({ error: "Book not found in wishlist" });
        }

        res.status(200).json({ message: "Book removed from wishlist successfully" });

    } catch (err) {
      console.error("Error removing book from wishlist:", err);
      res.status(500).json({ error: "Internal server error removing book from wishlist" });
    }
  }
};