const express = require("express");
const router = express.Router();
const bookDetailsController = require("../controllers/bookDetailsController");
const loanController = require("../controllers/loanController");
const { isAdmin } = require("../middleware/isAdmin");

router.get("/books", bookDetailsController.getBooks);
router.get("/books/:id", bookDetailsController.getBookById);
router.get("/books_issued/:user_id", loanController.getIssuedBooks);
router.get("/books/isbn/:isbn", bookDetailsController.getBookByISBN);
router.get("/books/title/:title", bookDetailsController.getBookByTitle);
router.get("/books/author/:author", bookDetailsController.getBookByAuthor);
router.post("/add_book", isAdmin, bookDetailsController.addBook);
router.post("/update_book/:isbn", isAdmin, bookDetailsController.updateBook);
router.post("/delete_book/:isbn", isAdmin, bookDetailsController.deleteBook);
router.post("/issue", isAdmin, loanController.issueBook);
router.post("/return", isAdmin, loanController.returnBook);

module.exports = router;
