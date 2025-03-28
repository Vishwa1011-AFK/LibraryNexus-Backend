const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  published_date: { type: Date, required: true },
  isbn: { type: String, required: true, unique: true, index: true },
  pages: { type: Number, required: true },
  cover: { type: String },
  language: { type: String, required: true },
  location: { type: String, required: true },
  issue_history: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      issue_date: { type: Date },
      return_date: { type: Date },
      due_date: { type: Date },
    },
  ],
  publisher: { type: String },
  category: { type: String, index: true },
  featured: { type: Boolean, default: false, index: true },
  description: { type: String }
});

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;