const Book = require("../models/Books");

async function findBookIdByISBN(isbn) {
  try {
    const book = await Book.findOne({ isbn });
    if (!book) throw new Error("Book not found");
    return book._id;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  findBookIdByISBN,
};
