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
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12; 
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.search) {

         filter.$or = [
             { title: { $regex: req.query.search, $options: 'i' } }, 
             { author: { $regex: req.query.search, $options: 'i' } },
             { isbn: { $regex: req.query.search, $options: 'i' } } 
         ];
      }
      if (req.query.category && req.query.category !== 'all') {
        filter.category = req.query.category;
      }
      if (req.query.author) {
         filter.author = { $regex: req.query.author, $options: 'i' }; 
      }
      if (req.query.featured === 'true') {
        filter.featured = true;
      }

      let sort = {};
      switch (req.query.sortBy) {
        case 'title_asc': 
          sort = { title: 1 };
          break;
        case 'title_desc': 
          sort = { title: -1 };
          break;
        case 'author_asc':
          sort = { author: 1 };
          break;
        case 'author_desc':
          sort = { author: -1 };
          break;
        case 'newest':
          sort = { _id: -1 }; 
          break;
        case 'oldest':
           sort = { _id: 1 };
           break;
        default:
          sort = { _id: -1 }; 
      }

      const booksQuery = Book.find(filter).sort(sort).skip(skip).limit(limit);
      const totalQuery = Book.countDocuments(filter);

      const [booksData, total] = await Promise.all([
          booksQuery.lean(), 
          totalQuery
      ]);

      const isbns = booksData.map(book => book.isbn);
      const inventoryData = await BookInventory.find({ isbn: { $in: isbns } }).lean();
      const inventoryMap = inventoryData.reduce((map, item) => {
        map[item.isbn] = item.availableCopies > 0;
        return map;
      }, {});

      const booksWithAvailability = booksData.map(book => ({
        ...book,
        id: book._id, 
        available: inventoryMap[book.isbn] || false, 
        coverUrl: book.cover, 
      }));

      let finalBooks = booksWithAvailability;
      if (req.query.available === 'true') {
          finalBooks = booksWithAvailability.filter(book => book.available);
      } else if (req.query.available === 'false') {
          finalBooks = booksWithAvailability.filter(book => !book.available);
      }

      res.status(200).json({
        books: finalBooks,
        total: total, 
        page,
        totalPages: Math.ceil(total / limit) 
      });
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Internal server error fetching books" });
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
  async getCategories(req, res) {
    try {
      const categories = await Book.distinct("category", { category: { $ne: null, $ne: "" } });
      res.status(200).json(categories.sort());
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Internal server error fetching categories" });
    }
  },
};