const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAdmin } = require("../middleware/isAdmin");

router.use(isAdmin);

router.get("/books", adminController.adminListBooks);
router.post("/books", adminController.adminAddBook);
router.put("/books/:id", adminController.adminUpdateBook);
router.delete("/books/:id", adminController.adminDeleteBook);

module.exports = router;