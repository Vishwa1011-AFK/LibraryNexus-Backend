const Loan = require("../models/Loan");
const Book = require("../models/Books");
const BookInventory = require("../models/BookInventory");
const scheduleEmailReminder = require("../controllers/bookReminderEmailController");
const { findUserByEmail, findUserById } = require("../services/userService");

async function issueBook(req, res) {
  try {
    const { isbn } = req.body;
    const userEmail = req.body;

    const book = await Book.findOne({ isbn, issued: false });
    if (!book) {
      return res.status(404).json({ error: "No available copies" });
    }

    const user = await findUserByEmail(userEmail);
    if (!user || user.role !== "student") {
      return res.status(400).json({ message: "Invalid user or not a student" });
    }

    const loan = new Loan({
      user: user._id,
      book: book._id,
    });

    await loan.save();
    book.issued = true;
    book.issue_history.push({
      user_id: user._id,
      issue_date: loan.issueDate,
      due_date: loan.returnDate,
    });
    await book.save();

    const inventory = await BookInventory.findOne({ isbn });
    inventory.availableCopies -= 1;
    await inventory.save();

    res.status(201).json({ message: "Book issued successfully", loan });

    scheduleEmailReminder(user.email, book.title, loan.returnDate);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while issuing the book" });
  }
}

async function returnBook(req, res) {
  try {
    const { email, bookId } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const loan = await Loan.findOne({
      user: user._id,
      book: bookId,
      returned: false,
    });
    if (!loan) {
      return res
        .status(404)
        .json({ error: "Active loan not found for this book" });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    loan.returned = true;
    await loan.save();

    book.issued = false;
    const historyEntry = book.issue_history.find(
      (history) => history.user_id.equals(user._id) && !history.return_date
    );
    if (historyEntry) {
      historyEntry.return_date = new Date();
      await book.save();
    }
    await book.save();

    const inventory = await BookInventory.findOne({ isbn: book.isbn });
    inventory.availableCopies += 1;
    await inventory.save();

    res.status(200).json({ message: "Book returned successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getIssuedBooks(req, res) {
  try {
    const { user_id } = req.params;

    const user = await findUserById(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const loans = await Loan.find({ user: user._id, returned: false }).populate(
      "book"
    );

    const issuedBooks = loans.map((loan) => ({
      bookId: loan.book._id,
      title: loan.book.title,
      author: loan.book.author,
      issueDate: loan.issueDate,
      dueDate: loan.returnDate,
    }));

    res.status(200).json({ issuedBooks });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching issued books" });
  }
}

module.exports = { issueBook, returnBook, getIssuedBooks };
