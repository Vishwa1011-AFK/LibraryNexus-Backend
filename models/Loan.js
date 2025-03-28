const mongoose = require("mongoose");

function calculateReturnDate(issueDate) {
  const returnDate = new Date(issueDate);
  returnDate.setDate(returnDate.getDate() + 14);
  return returnDate;
}

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  book: { type: mongoose.Types.ObjectId, ref: "Book", required: true },
  issueDate: { type: Date, default: Date.now },
  returnDate: {
    type: Date,
    required: true,
    default: function () {
      return calculateReturnDate(this.issueDate || new Date());
    },
  },
  returned: { type: Boolean, default: false, index: true },
  actualReturnDate: { type: Date }
});

loanSchema.index({ user: 1, returned: 1 });

const Loan = mongoose.model("Loan", loanSchema);
module.exports = Loan;
