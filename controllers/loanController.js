const Loan = require("../models/Loan");
const Book = require("../models/Books");
const BookInventory = require("../models/BookInventory");
const { findUserByEmail, findUserById } = require("../services/userService");
const { scheduleEmailReminder } = require("../controllers/bookReminderEmailController");

async function issueBook(req, res) {
  try {
    const { email, isbn } = req.body;
    const book = await Book.findOne({ isbn });
    if (!book) return res.status(404).json({ error: "Book not found" });

    const user = await findUserByEmail(email);
    if (!user || user.role !== "student") {
      return res.status(400).json({ message: "Invalid user or not a student" });
    }

    const inventory = await BookInventory.findOne({ isbn });
    if (!inventory || inventory.availableCopies <= 0) {
      return res.status(404).json({ error: "No available copies" });
    }

    const loan = new Loan({
      user: user._id,
      book: book._id,
    });

    inventory.availableCopies -= 1;
    book.issue_history.push({
      user_id: user._id,
      issue_date: loan.issueDate,
      due_date: loan.returnDate,
    });

    await Promise.all([loan.save(), inventory.save(), book.save()]);

    res.status(201).json({ message: "Book issued successfully", loan });

    scheduleEmailReminder(user.email, book._id, loan.returnDate);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}

async function returnBook(req, res) {
  try {
    const { email, bookId } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ message: "Invalid user" });

    const loan = await Loan.findOne({ user: user._id, book: bookId, returned: false });
    if (!loan) return res.status(404).json({ error: "Active loan not found for this book" });

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });

    loan.returned = true;
    const historyEntry = book.issue_history.find(
      (history) => history.user_id.equals(user._id) && !history.return_date
    );
    if (historyEntry) historyEntry.return_date = new Date();

    const inventory = await BookInventory.findOne({ isbn: book.isbn });
    inventory.availableCopies += 1;

    await Promise.all([loan.save(), book.save(), inventory.save()]);

    res.status(200).json({ message: "Book returned successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getIssuedBooks(req, res) {
  try {
    const { user_id } = req.params;
    const user = await findUserById(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const loans = await Loan.find({ user: user._id, returned: false }).populate("book");
    const issuedBooks = loans.map((loan) => ({
      bookId: loan.book._id,
      title: loan.book.title,
      author: loan.book.author,
      issueDate: loan.issueDate,
      dueDate: loan.returnDate,
    }));

    res.status(200).json({ issuedBooks });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { issueBook, returnBook, getIssuedBooks };