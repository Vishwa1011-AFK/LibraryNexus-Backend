const Book = require("../models/Books");
const BookInventory = require("../models/BookInventory");

module.exports = {
  async getBookByISBN(req, res) {
    try {
      const book = await Book.findOne({ isbn: req.params.isbn });
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json(book);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async getBooks(req, res) {
    try {
      const books = await Book.find();
      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async getBookById(req, res) {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json(book);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async getBookByTitle(req, res) {
    try {
      const books = await Book.find({ title: req.params.title });
      if (!books.length) return res.status(404).json({ error: "No books found" });
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async getBookByAuthor(req, res) {
    try {
      const books = await Book.find({ author: req.params.author });
      if (!books.length) return res.status(404).json({ error: "No books found" });
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async addBook(req, res) {
    try {
      const existingBook = await Book.findOne({ isbn: req.body.isbn });
      if (existingBook) return res.status(400).json({ error: "Book with this ISBN already exists" });

      const book = new Book(req.body);
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
      res.status(201).json({ message: "Book Saved Successfully" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async updateBook(req, res) {
    try {
      const book = await Book.findOneAndUpdate(
        { isbn: req.params.isbn },
        req.body,
        { new: true, runValidators: true }
      );
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json(book);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  async deleteBook(req, res) {
    try {
      const book = await Book.findOneAndDelete({ isbn: req.params.isbn });
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.status(204).json({ message: "Book Deleted Successfully" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
};