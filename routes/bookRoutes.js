const express = require("express");
const router = express.Router();
const bookDetailsController = require("../controllers/bookDetailsController");

router.get("/books", bookDetailsController.getBooks);
router.get("/books/:id", bookDetailsController.getBookById);
router.get("/categories", bookDetailsController.getCategories);
router.get("/authors", bookDetailsController.getAuthors);

module.exports = router;
