const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  published_date: { type: String, required: true },
  isbn: { type: String, required: true },
  pages: { type: Number, required: true },
  cover: { type: String },
  language: { type: String, required: true },
  location: { type: String, required: true },
  copies_available: { type: Number, required: true, default: 1 },
  total_copies: { type: Number, required: true, default: 1 },
  status: {
    type: String,
    enum: ["available", "issued", "lost"],
    default: "available",
  },
  issue_history: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      issue_date: { type: Date },
      return_date: { type: Date },
      due_date: { type: Date },
    },
  ],
  publisher: { type: String },
});

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
