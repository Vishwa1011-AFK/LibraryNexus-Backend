const Book = require("../models/Books");
const BookInventory = require("../models/BookInventory");
const { findBookIdByISBN } = require("../services/bookService");

module.exports = {
  async getBookByISBN(req, res) {
    try {
      const book = await Book.findOne({ isbn: req.params.isbn });
      if (!book) return res.status(404).send("Book not found");
      res.json(book);
    } catch (error) {
      res.status(500).send(error.message);
    }
  },
  async getBooks(req, res) {
    try {
      const books = await Book.find();
      res.status(200).json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getBookById(req, res) {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).send("Book not found");
      res.json(book);
    } catch (error) {
      res.status(500).send(error.message);
    }
  },

  async getBookByTitle(req, res) {
    try {
      const book = await Book.findOne({ title: req.params.title });
      if (!book) return res.status(404).send("Book not found");
      res.json(book);
    } catch (error) {
      res.status(500).send(error.message);
    }
  },

  async getBookByAuthor(req, res) {
    try {
      const book = await Book.findOne({ author: req.params.author });
      if (!book) return res.status(404).send("Book not found");
      res.json(book);
    } catch (error) {
      res.status(500).send(error.message);
    }
  },

  async addBook(req, res) {
    const book = new Book(req.body);
    try {
      await book.save();
      const { isbn, title, author } = book;
      let inventory = await BookInventory.findOne({ isbn });
      if (inventory) {
        inventory.totalCopies += 1;
        inventory.availableCopies += 1;
      } else {
        inventory = new BookInventory({
          isbn,
          title,
          author,
          totalCopies: 1,
          availableCopies: 1,
        });
      }
      await inventory.save();
      res.status(201).json("Book Saved Successfully.");
    } catch (error) {
      res.status(400).send(error.message);
    }
  },

  async updateBook(req, res) {
    try {
      const bookId = await findBookIdByISBN(req.params.isbn);
      const book = await Book.findByIdAndUpdate(bookId, req.body, {
        new: true,
        runValidators: true,
      });
      if (!book) return res.status(404).send("Book not found");
      res.json(book);
    } catch (error) {
      res.status(400).send(error.message);
    }
  },

  async deleteBook(req, res) {
    try {
      const bookId = await findBookIdByISBN(req.params.isbn);
      const book = await Book.findByIdAndDelete(bookId);
      if (!book) return res.status(404).send("Book not found");
      res.status(204).send("Book Deleted Succesfully");
    } catch (error) {
      res.status(500).send(error.message);
    }
  },
};
