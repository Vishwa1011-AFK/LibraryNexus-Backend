const mongoose = require("mongoose");

const bookInventorySchema = new mongoose.Schema({
  isbn: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  totalCopies: { type: Number, required: true },
  availableCopies: { type: Number, required: true },
});

const BookInventory = mongoose.model("BookInventory", bookInventorySchema);
module.exports = BookInventory;
