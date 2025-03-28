const express = require("express");
const router = express.Router();
const bookDetailsController = require("../controllers/bookDetailsController");
const loanController = require("../controllers/loanController");
const { isAdmin } = require("../middleware/isAdmin");

router.get("/books", bookDetailsController.getBooks);
router.get("/books/:id", bookDetailsController.getBookById);
router.get("/categories", bookDetailsController.getCategories);
router.get("/authors", bookDetailsController.getAuthors);

router.get("/books/isbn/:isbn", bookDetailsController.getBookByISBN);
router.get("/books/title/:title", bookDetailsController.getBookByTitle);
router.get("/books/author/:author", bookDetailsController.getBookByAuthor);

router.post("/issue", loanController.issueBook);
router.post("/return", loanController.returnBook);

router.post("/issue", isAdmin, loanController.issueBook);
router.post("/return", isAdmin, loanController.returnBook);

module.exports = router;
