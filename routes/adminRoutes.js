const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAdmin } = require("../middleware/isAdmin");

router.use(isAdmin);

router.get("/books", adminController.adminListBooks);
router.post("/books", adminController.adminAddBook);
router.get("/books/:id", adminController.adminGetBookDetail);
router.put("/books/:id", adminController.adminUpdateBook);
router.delete("/books/:id", adminController.adminDeleteBook);

router.post("/loans/issue/:bookId", adminController.adminIssueBook);
router.post("/loans/return/:loanId", adminController.adminReturnBook);

module.exports = router;