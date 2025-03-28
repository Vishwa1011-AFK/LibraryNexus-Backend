const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAdmin } = require("../middleware/isAdmin");

router.use(isAdmin);

router.get("/dashboard-stats", adminController.adminGetDashboardStats);

router.get("/books", adminController.adminListBooks);
router.post("/books", adminController.adminAddBook);
router.get("/books/:id", adminController.adminGetBookDetail);
router.put("/books/:id", adminController.adminUpdateBook);
router.delete("/books/:id", adminController.adminDeleteBook);

router.post("/loans/issue/:bookId", adminController.adminIssueBook);
router.post("/loans/return/:loanId", adminController.adminReturnBook);

router.get("/users", adminController.adminListUsers);
router.get("/users/:userId", adminController.adminGetUserDetail);
router.put("/users/:userId", adminController.adminUpdateUser);
router.delete("/users/:userId", adminController.adminDeleteUser);


module.exports = router;