const Wishlist = require("../models/Wishlist");
const { findBookIdByISBN } = require("../services/bookService");
const Book = require('../models/Books'); 

async function getWishlist(req, res) {
  try {
    const wishlist = await Wishlist.findOne({ userId: new mongoose.Types.ObjectId(req.params.userId) });
    if (!wishlist) return res.status(404).send("Wishlist not found");
    res.json(wishlist);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

async function addBookToWishlist(req, res) {
    try {
        let wishlist = await Wishlist.findOne({ userId: req.params.userId });

        if (!wishlist) {
          wishlist = new Wishlist({ userId: req.params.userId, books: [] });
        }

        const bookId = await findBookIdByISBN(req.body.isbn);
        const book = await Book.findById(bookId);

        if (!book) {
            return res.status(404).send("Book not found");
        }

        wishlist.books.push({
            isbn: book.isbn,
            author: book.author,
            title: book.title,
            addedAt: Date.now()
        });
        await wishlist.save();
        res.status(201).json(wishlist);

    } catch (error) {
        console.error("Error adding book to wishlist:", error);
        res.status(500).send(error.message);
    }
}

async function removeBookFromWishlist(req, res) {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.params.userId });
    if (!wishlist) return res.status(404).send("Wishlist not found");

    wishlist.books = wishlist.books.filter(
      (book) => book.isbn !== req.params.isbn
    );
    await wishlist.save();
    res.status(200).json(wishlist);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

module.exports = { getWishlist, addBookToWishlist, removeBookFromWishlist };