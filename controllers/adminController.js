const mongoose = require('mongoose');
const Book = require("../models/Books");
const BookInventory = require("../models/BookInventory");
const Loan = require("../models/Loan");
const Wishlist = require("../models/Wishlist");

module.exports = {
  async adminAddBook(req, res) {
    try {
      const {
        title, author, publishDate, isbn, pages, cover, language, location, publisher, category, featured, description, totalCopies = 1
      } = req.body;

      if (!title || !author || !publishDate || !isbn || !pages || !language || !location) {
          return res.status(400).json({ error: "Missing required book fields (title, author, publishDate, isbn, pages, language, location)." });
      }

      const existingBook = await Book.findOne({ isbn: isbn });
      if (existingBook) {
        return res.status(400).json({ error: "Book with this ISBN already exists" });
      }

      const book = new Book({
          title, author, publishDate, isbn, pages, cover, language, location, publisher, category, featured, description
      });
      await book.save();

      const inventory = new BookInventory({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        totalCopies: parseInt(totalCopies, 10) || 1,
        availableCopies: parseInt(totalCopies, 10) || 1,
      });
      await inventory.save();

      res.status(201).json({ message: "Book added successfully", book });

    } catch (error) {
      console.error("Error adding book:", error);
      if (error.name === 'ValidationError') {
          return res.status(400).json({ error: "Validation Error", details: error.message });
      }
      res.status(500).json({ error: "Internal server error adding book" });
    }
  },

  async adminUpdateBook(req, res) {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid Book ID format" });
    }

    try {
        const book = await Book.findById(id);
        if (!book) {
          return res.status(404).json({ error: "Book not found" });
        }

        if (updateData.isbn && updateData.isbn !== book.isbn) {
            const existingISBN = await Book.findOne({ isbn: updateData.isbn });
            if (existingISBN) {
                return res.status(400).json({ error: "Cannot update to an ISBN that already exists." });
            }
        }

        Object.assign(book, updateData);
        const updatedBook = await book.save();

        const inventory = await BookInventory.findOne({ isbn: updatedBook.isbn });
        if (inventory) {
          inventory.title = updatedBook.title;
          inventory.author = updatedBook.author;
          if (updateData.totalCopies !== undefined) {
              const newTotal = parseInt(updateData.totalCopies, 10);
              const diff = newTotal - inventory.totalCopies;
              inventory.totalCopies = newTotal;
              inventory.availableCopies = Math.max(0, inventory.availableCopies + diff);
          }
          await inventory.save();
        }

        res.status(200).json({ message: "Book updated successfully", book: updatedBook });

    } catch (error) {
        console.error("Error updating book:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: "Validation Error", details: error.message });
        }
        if (error.code === 11000) {
            return res.status(400).json({ error: "Duplicate key error, possibly ISBN already exists." });
        }
        res.status(500).json({ error: "Internal server error updating book" });
    }
  },

  async adminDeleteBook(req, res) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid Book ID format" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const book = await Book.findById(id).session(session);
        if (!book) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ error: "Book not found" });
        }

        const bookIsbn = book.isbn;

        await Book.findByIdAndDelete(id).session(session);
        await BookInventory.deleteOne({ isbn: bookIsbn }).session(session);

        const activeLoans = await Loan.find({ book: id, returned: false }).session(session);
        if (activeLoans.length > 0) {
             await Loan.deleteMany({ book: id }).session(session);
        } else {
             await Loan.deleteMany({ book: id }).session(session);
        }

        await Wishlist.updateMany(
            { 'books.isbn': bookIsbn },
            { $pull: { books: { isbn: bookIsbn } } }
        ).session(session);

        await session.commitTransaction();
        res.status(200).json({ message: "Book and associated data deleted successfully" });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error deleting book:", error);
        res.status(500).json({ error: "Internal server error deleting book" });
    } finally {
        session.endSession();
    }
  },
  async adminListBooks(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { title: searchRegex },
                { author: searchRegex },
                { isbn: searchRegex },
                { category: searchRegex }
            ];
        }
        if (req.query.category) {
            filter.category = req.query.category;
        }

        let sort = {};
        switch (req.query.sortBy) {
            case 'title_asc': sort = { title: 1 }; break;
            case 'title_desc': sort = { title: -1 }; break;
            case 'author_asc': sort = { author: 1 }; break;
            case 'author_desc': sort = { author: -1 }; break;
            default: sort = { title: 1 };
        }

        const pipeline = [
            { $match: filter },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: BookInventory.collection.name,
                    localField: 'isbn',
                    foreignField: 'isbn',
                    as: 'inventoryInfo'
                }
            },
            {
                $unwind: {
                    path: '$inventoryInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    author: 1,
                    category: 1,
                    isbn: 1,
                    cover: 1,
                    publishDate: 1,
                    location: 1,
                    totalCopies: { $ifNull: ["$inventoryInfo.totalCopies", 0] },
                    availableCopies: { $ifNull: ["$inventoryInfo.availableCopies", 0] },
                    status: {
                        $cond: {
                            if: { $gt: [{ $ifNull: ["$inventoryInfo.availableCopies", 0] }, 0] },
                            then: "Available",
                            else: "Unavailable"
                        }
                    },
                    addedDate: "$_id"
                }
            }
        ];

        const books = await Book.aggregate(pipeline);
        const total = await Book.countDocuments(filter);

        const formattedBooks = books.map(book => ({
            ...book,
            id: book._id,
            coverUrl: book.cover,
            added: book.addedDate.getTimestamp()
        }));

        res.status(200).json({
            books: formattedBooks,
            total: total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Error listing admin books:", error);
        res.status(500).json({ error: "Internal server error listing admin books" });
    }
}
};
