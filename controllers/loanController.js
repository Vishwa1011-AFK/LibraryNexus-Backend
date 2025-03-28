const mongoose = require("mongoose")
const Loan = require("../models/Loan");
const Book = require("../models/Books");
const BookInventory = require("../models/BookInventory");
const { findUserByEmail, findUserById } = require("../services/userService");

async function getIssuedBooks(req, res) {
  try {
      const { user_id } = req.params;
      const loans = await Loan.find({ user: user_id, returned: false }).populate("book");
      res.status(200).json({});
  } catch (error) {
      res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { getIssuedBooks };