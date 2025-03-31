const mongoose = require('mongoose');
const Book = require("../models/Books");
const BookInventory = require("../models/BookInventory");
const Loan = require("../models/Loan");
const Wishlist = require("../models/Wishlist");
const User = require("../models/Users");
const RefreshToken = require("../models/RefreshToken");
const { findUserByEmail, findUserById } = require("../services/userService");

module.exports = {
    async adminAddBook(req, res) {
        try {
          const {
            title, author, publishDate, isbn, pages, cover, language, location, publisher, category, featured, description, totalCopies = 1
          } = req.body;
    
          if (!title || !author || !publishDate || !isbn || !pages || !language || !location) {
              return res.status(400).json({ error: "Missing required book fields (title, author, publishDate, isbn, pages, language, location)." });
          }
    
          const existingBook = await Book.findOne({ isbn: isbn });
          if (existingBook) {
            return res.status(400).json({ error: "Book with this ISBN already exists" });
          }
    
          const book = new Book({
              title, author, publishDate, isbn, pages, cover, language, location, publisher, category, featured, description
          });
          await book.save();
    
          const inventory = new BookInventory({
            isbn: book.isbn,
            title: book.title,
            author: book.author,
            totalCopies: parseInt(totalCopies, 10) || 1,
            availableCopies: parseInt(totalCopies, 10) || 1,
          });
          await inventory.save();
    
          res.status(201).json({ message: "Book added successfully", book });
    
        } catch (error) {
          console.error("Error adding book:", error);
          if (error.name === 'ValidationError') {
              return res.status(400).json({ error: "Validation Error", details: error.message });
          }
          res.status(500).json({ error: "Internal server error adding book" });
        }
      },
    
      async adminUpdateBook(req, res) {
        const { id } = req.params;
        const updateData = req.body;
    
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid Book ID format" });
        }
    
        try {
            const book = await Book.findById(id);
            if (!book) {
              return res.status(404).json({ error: "Book not found" });
            }
    
            const originalIsbn = book.isbn;
    
            if (updateData.isbn && updateData.isbn !== originalIsbn) {
                const existingISBN = await Book.findOne({ isbn: updateData.isbn });
                if (existingISBN && existingISBN._id.toString() !== id) {
                    return res.status(400).json({ error: "Cannot update to an ISBN that already exists." });
                }
            }
    
            Object.assign(book, updateData);
            const updatedBook = await book.save();
    
            const inventory = await BookInventory.findOne({ isbn: originalIsbn });
            if (inventory) {
                inventory.title = updatedBook.title;
                inventory.author = updatedBook.author;
                if (updatedBook.isbn !== originalIsbn) {
                    inventory.isbn = updatedBook.isbn;
                }
                if (updateData.totalCopies !== undefined) {
                    const newTotal = parseInt(updateData.totalCopies, 10);
                    const diff = newTotal - inventory.totalCopies;
                    inventory.totalCopies = newTotal;
                    inventory.availableCopies = Math.max(0, inventory.availableCopies + diff);
                    if (inventory.availableCopies > inventory.totalCopies) {
                        inventory.availableCopies = inventory.totalCopies;
                    }
                }
                await inventory.save();
            } else {
                 console.warn(`Inventory not found for original ISBN ${originalIsbn} during update of book ${id}.`);
            }
    
    
            res.status(200).json({ message: "Book updated successfully", book: updatedBook });
    
        } catch (error) {
            console.error("Error updating book:", error);
            if (error.name === 'ValidationError') {
                return res.status(400).json({ error: "Validation Error", details: error.message });
            }
            if (error.code === 11000) {
                 if (error.keyPattern && error.keyPattern.isbn) {
                     return res.status(400).json({ error: "ISBN already exists." });
                 }
                return res.status(400).json({ error: "Duplicate key error." });
            }
            res.status(500).json({ error: "Internal server error updating book" });
        }
      },
    
      async adminDeleteBook(req, res) {
        const { id } = req.params;
    
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid Book ID format" });
        }
    
        const session = await mongoose.startSession();
        session.startTransaction();
    
        try {
            const book = await Book.findById(id).session(session);
            if (!book) {
              await session.abortTransaction();
              session.endSession();
              return res.status(404).json({ error: "Book not found" });
            }
    
            const bookIsbn = book.isbn;
    
            const activeLoans = await Loan.find({ book: id, returned: false }).session(session);
            if (activeLoans.length > 0) {
                 await session.abortTransaction();
                 session.endSession();
                 return res.status(400).json({ error: `Cannot delete book. It has ${activeLoans.length} active loan(s).` });
            }
    
            await Book.findByIdAndDelete(id).session(session);
            await BookInventory.deleteOne({ isbn: bookIsbn }).session(session);
            await Loan.deleteMany({ book: id }).session(session);
    
            await Wishlist.updateMany(
                { 'books.bookId': id },
                { $pull: { books: { bookId: id } } }
            ).session(session);
    
            await session.commitTransaction();
            res.status(200).json({ message: "Book and associated data deleted successfully" });
    
        } catch (error) {
            await session.abortTransaction();
            console.error("Error deleting book:", error);
            res.status(500).json({ error: "Internal server error deleting book" });
        } finally {
            session.endSession();
        }
      },
      async adminListBooks(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 15;
            const skip = (page - 1) * limit;
    
            const initialFilter = {};
            if (req.query.search) {
                const searchRegex = new RegExp(req.query.search, 'i');
                initialFilter.$or = [
                    { title: searchRegex },
                    { author: searchRegex },
                    { isbn: searchRegex },
                     { category: searchRegex }
                ];
            }
             if (req.query.category && req.query.category !== 'all') {
                initialFilter.category = req.query.category;
             }
             if (req.query.featured === 'true') {
                 initialFilter.featured = true;
             } else if (req.query.featured === 'false') {
                 initialFilter.featured = { $ne: true };
             }
    
    
            let sort = {};
            switch (req.query.sortBy) {
                case 'title_asc': sort = { title: 1 }; break;
                case 'title_desc': sort = { title: -1 }; break;
                case 'author_asc': sort = { author: 1 }; break;
                case 'author_desc': sort = { author: -1 }; break;
                case 'addedDate_desc': sort = { _id: -1 }; break;
                case 'addedDate_asc': sort = { _id: 1 }; break;
                default: sort = { title: 1 };
            }
    
    
            const pipeline = [
                { $match: initialFilter },
                {
                    $lookup: {
                        from: BookInventory.collection.name,
                        localField: 'isbn',
                        foreignField: 'isbn',
                        as: 'inventoryInfo'
                    }
                },
                {
                    $unwind: {
                        path: '$inventoryInfo',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                     $match: {
                         ...(req.query.status === 'available' && { 'inventoryInfo.availableCopies': { $gt: 0 } }),
                         ...(req.query.status === 'unavailable' && { $or: [ { 'inventoryInfo.availableCopies': { $lte: 0 } }, { 'inventoryInfo.availableCopies': { $exists: false } } ] }),
                     }
                },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        author: 1,
                        category: 1,
                        isbn: 1,
                        cover: 1,
                        publishDate: 1,
                        location: 1,
                        totalCopies: { $ifNull: ["$inventoryInfo.totalCopies", 0] },
                        availableCopies: { $ifNull: ["$inventoryInfo.availableCopies", 0] },
                        status: {
                            $cond: {
                                if: { $gt: [{ $ifNull: ["$inventoryInfo.availableCopies", 0] }, 0] },
                                then: "Available",
                                else: "Unavailable"
                            }
                        },
                        addedDate: "$_id"
                    }
                }
            ];
    
            const books = await Book.aggregate(pipeline);
    
             const countPipeline = [
                 { $match: initialFilter },
                 { $lookup: { from: BookInventory.collection.name, localField: 'isbn', foreignField: 'isbn', as: 'inventoryInfo' }},
                 { $unwind: { path: '$inventoryInfo', preserveNullAndEmptyArrays: true }},
                 { $match: {
                     ...(req.query.status === 'available' && { 'inventoryInfo.availableCopies': { $gt: 0 } }),
                     ...(req.query.status === 'unavailable' && { $or: [ { 'inventoryInfo.availableCopies': { $lte: 0 } }, { 'inventoryInfo.availableCopies': { $exists: false } } ] }),
                 }},
                 { $count: "total" }
             ];
             const countResult = await Book.aggregate(countPipeline);
             const total = countResult.length > 0 ? countResult[0].total : 0;
    
    
            const formattedBooks = books.map(book => ({
                ...book,
                id: book._id,
                coverUrl: book.cover,
                added: book.addedDate.getTimestamp()
            }));
    
            res.status(200).json({
                books: formattedBooks,
                total: total,
                page,
                totalPages: Math.ceil(total / limit)
            });
    
        } catch (error) {
            console.error("Error listing admin books:", error);
            res.status(500).json({ error: "Internal server error listing admin books" });
        }
      },
      async adminGetBookDetail(req, res) {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid Book ID format" });
        }
    
        try {
            const book = await Book.findById(id).lean();
            if (!book) {
                return res.status(404).json({ error: "Book not found" });
            }
    
            const inventory = await BookInventory.findOne({ isbn: book.isbn }).lean();
            const recentHistory = await Loan.find({ book: id })
                .sort({ issueDate: -1 })
                .limit(10)
                .populate('user', 'firstName lastName email')
                .lean();
    
            const formattedHistory = recentHistory.map(loan => ({
                id: loan._id,
                userId: loan.user?._id,
                userName: loan.user ? `${loan.user.firstName} ${loan.user.lastName}` : 'N/A',
                userEmail: loan.user?.email,
                issuedOn: loan.issueDate,
                submissionDate: loan.returnDate,
                returnedDate: loan.actualReturnDate,
                status: loan.returned ? "Returned" : (new Date(loan.returnDate) < new Date() ? "Overdue" : "Issued")
            }));
    
            const bookDetail = {
                ...book,
                id: book._id,
                coverUrl: book.cover,
                totalCopies: inventory?.totalCopies ?? 0,
                availableCopies: inventory?.availableCopies ?? 0,
                available: (inventory?.availableCopies ?? 0) > 0,
                issueHistory: formattedHistory,
            };
    
            res.status(200).json(bookDetail);
        } catch (error) {
            console.error("Error fetching admin book detail:", error);
            res.status(500).json({ error: "Internal server error fetching admin book detail" });
        }
      },
  async adminIssueBook(req, res) {
    const { bookId } = req.params;
    const { userEmail, issueDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ error: "Invalid Book ID format" });
    }
    if (!userEmail || typeof userEmail !== 'string' || !/\S+@\S+\.\S+/.test(userEmail)) {
        return res.status(400).json({ error: "Valid User Email is required in the request body" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findOne({ email: userEmail }).session(session);
        if (!user) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json({ message: "User with this email not found" });
        }
        const userId = user._id;

        const book = await Book.findById(bookId).session(session);
        if (!book) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json({ error: "Book not found" });
        }

        const inventory = await BookInventory.findOne({ isbn: book.isbn }).session(session);
        if (!inventory || inventory.availableCopies <= 0) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json({ error: "No available copies to issue" });
        }

        const existingLoan = await Loan.findOne({ user: userId, book: bookId, returned: false }).session(session);
        if (existingLoan) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json({ error: "User already has this book issued." });
        }

        inventory.availableCopies -= 1;
        await inventory.save({ session });

        const loanData = { user: userId, book: bookId };
        if (issueDate) {
             try {
                 loanData.issueDate = new Date(issueDate);
                 if (isNaN(loanData.issueDate.getTime())) throw new Error("Invalid date format");
             } catch (e) {
                 await session.abortTransaction(); session.endSession();
                 return res.status(400).json({ error: "Invalid issue date format provided." });
             }
         }

        const loan = new Loan(loanData);
        await loan.save({ session });

        await session.commitTransaction();
        res.status(201).json({ message: `Book issued successfully to ${userEmail}`, loan });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error issuing book:", error);
        if (error.message.includes("User with this email not found")) {
             return res.status(404).json({ message: "User with this email not found" });
        }
        res.status(500).json({ error: "Internal server error issuing book" });
    } finally {
        session.endSession();
    }
  },
  async adminReturnBook(req, res) {
    const { loanId } = req.params;
    const { returnDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
        return res.status(400).json({ error: "Invalid Loan ID format" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const loan = await Loan.findById(loanId).session(session);
        if (!loan) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json({ error: "Loan record not found" });
        }
        if (loan.returned) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json({ error: "Book has already been returned" });
        }

        const book = await Book.findById(loan.book).session(session);
        if (!book) {
             console.warn(`Book associated with loan ${loanId} (ID: ${loan.book}) not found during return.`);
        }

        loan.returned = true;
        loan.actualReturnDate = returnDate ? new Date(returnDate) : new Date();
         try {
            if (returnDate && isNaN(loan.actualReturnDate.getTime())) throw new Error("Invalid date format");
         } catch (e) {
             await session.abortTransaction(); session.endSession();
             return res.status(400).json({ error: "Invalid return date format provided." });
         }
        await loan.save({ session });

        if (book?.isbn) {
            const inventory = await BookInventory.findOne({ isbn: book.isbn }).session(session);
            if (inventory) {
                inventory.availableCopies += 1;
                if (inventory.availableCopies > inventory.totalCopies) {
                     inventory.availableCopies = inventory.totalCopies;
                }
                await inventory.save({ session });
            } else {
                 console.warn(`Inventory not found for ISBN ${book.isbn} during return of loan ${loanId}. Availability not increased.`);
            }
        } else {
             console.warn(`Could not find ISBN for book associated with loan ${loanId}. Inventory not updated.`);
        }


        await session.commitTransaction();
        res.status(200).json({ message: "Book returned successfully", loan });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error returning book:", error);
        res.status(500).json({ error: "Internal server error returning book" });
    } finally {
        session.endSession();
    }
},
async adminRenewLoan(req, res) {
    const { loanId } = req.params;
    const { renewalDays = 14 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
        return res.status(400).json({ error: "Invalid Loan ID format" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const loan = await Loan.findById(loanId).session(session);
        if (!loan) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json({ error: "Loan record not found" });
        }
        if (loan.returned) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json({ error: "Cannot renew a loan that has already been returned." });
        }

        const currentReturnDate = loan.returnDate;
        const newReturnDate = new Date(currentReturnDate);
        newReturnDate.setDate(newReturnDate.getDate() + parseInt(renewalDays, 10));

        loan.returnDate = newReturnDate;
        await loan.save({ session });

        await session.commitTransaction();
        res.status(200).json({ message: `Loan renewed successfully. New due date: ${newReturnDate.toLocaleDateString()}`, loan });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error renewing loan:", error);
        res.status(500).json({ error: "Internal server error renewing loan" });
    } finally {
        session.endSession();
    }
  },
async adminListLoans(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status === 'active') {
            filter.returned = false;
        } else if (req.query.status === 'returned') {
            filter.returned = true;
        } else if (req.query.status === 'overdue') {
             filter.returned = false;
             filter.returnDate = { $lt: new Date() };
        }

        let sort = {};
        switch (req.query.sortBy) {
            case 'issueDate_desc': sort = { issueDate: -1 }; break;
            case 'issueDate_asc': sort = { issueDate: 1 }; break;
            case 'returnDate_desc': sort = { returnDate: -1 }; break;
            case 'returnDate_asc': sort = { returnDate: 1 }; break;
            default: sort = { issueDate: -1 };
        }

        const loansQuery = Loan.find(filter)
                              .populate('user', 'firstName lastName email')
                              .populate('book', 'title author isbn')
                              .sort(sort)
                              .skip(skip)
                              .limit(limit);

        const totalQuery = Loan.countDocuments(filter);

        const [loans, total] = await Promise.all([loansQuery.lean(), totalQuery]);

        const formattedLoans = loans.map(loan => {
             const isOverdue = !loan.returned && new Date(loan.returnDate) < new Date();
             let status = 'Returned';
             if (!loan.returned) {
                 status = isOverdue ? 'Overdue' : 'Issued';
             }
            return {
                ...loan,
                id: loan._id,
                user: loan.user ? { ...loan.user, name: `${loan.user.firstName || ''} ${loan.user.lastName || ''}`.trim(), _id: loan.user._id } : null,
                book: loan.book ? { ...loan.book, _id: loan.book._id } : null,
                status: status
            }
        });

        res.status(200).json({
            loans: formattedLoans,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Error listing admin loans:", error);
        res.status(500).json({ error: "Internal server error listing admin loans" });
    }
  },
  async adminGetDashboardStats(req, res) {
    try {
        const totalBooksPromise = Book.countDocuments();
        const activeBorrowsPromise = Loan.countDocuments({ returned: false });
        const overdueBorrowsPromise = Loan.countDocuments({
            returned: false,
            returnDate: { $lt: new Date() }
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const startObjectIdString = Math.floor(startOfMonth.getTime() / 1000).toString(16) + "0000000000000000";
        const endObjectIdString = Math.floor(endOfMonth.getTime() / 1000).toString(16) + "0000000000000000";

        const startObjectId = new mongoose.Types.ObjectId(startObjectIdString);
        const endObjectId = new mongoose.Types.ObjectId(endObjectIdString);

        const newThisMonthPromise = Book.countDocuments({
            _id: { $gte: startObjectId, $lte: endObjectId }
        });

        const [totalBooks, activeBorrows, overdueBorrows, newThisMonth] = await Promise.all([
            totalBooksPromise,
            activeBorrowsPromise,
            overdueBorrowsPromise,
            newThisMonthPromise
        ]);

        res.json({
            totalBooks,
            activeBorrows,
            overdue: overdueBorrows,
            newThisMonth
        });

    } catch (error) {
        console.error("Error fetching admin dashboard stats:", error);
        res.status(500).json({ error: "Internal server error fetching dashboard stats" });
    }
  },
  async adminListUsers(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
            ];
        }
        if (req.query.role && ['student', 'admin'].includes(req.query.role)) {
            filter.role = req.query.role;
        }
        if (req.query.verified) {
             filter.email_verified = req.query.verified === 'true';
        }

        let sort = {};
         switch (req.query.sortBy) {
            case 'name_asc': sort = { lastName: 1, firstName: 1 }; break;
            case 'name_desc': sort = { lastName: -1, firstName: -1 }; break;
            case 'email_asc': sort = { email: 1 }; break;
            case 'email_desc': sort = { email: -1 }; break;
            case 'role_asc': sort = { role: 1 }; break;
            case 'role_desc': sort = { role: -1 }; break;
            default: sort = { lastName: 1, firstName: 1 };
        }

        const usersQuery = User.find(filter)
                            .select('-password -otp -otpExpiry -__v')
                            .sort(sort)
                            .skip(skip)
                            .limit(limit);

        const totalQuery = User.countDocuments(filter);

        const [users, total] = await Promise.all([usersQuery.lean(), totalQuery]);

        const formattedUsers = users.map(user => ({
            ...user,
            id: user._id
        }));

        res.status(200).json({
            users: formattedUsers,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Error listing users:", error);
        res.status(500).json({ error: "Internal server error listing users" });
    }
},
async adminGetUserDetail(req, res) {
    const { userId } = req.params;
     if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid User ID format" });
    }
    try {
        const user = await User.findById(userId)
                            .select('-password -otp -otpExpiry -__v')
                            .lean();

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

         const recentLoans = await Loan.find({ user: userId })
                                     .sort({ issueDate: -1 })
                                     .limit(5)
                                     .populate('book', 'title isbn')
                                     .lean();

        res.status(200).json({ ...user, id: user._id, recentLoans });

    } catch (error) {
         console.error("Error fetching user detail:", error);
         res.status(500).json({ error: "Internal server error fetching user detail" });
    }
  },
  async adminUpdateUser(req, res) {
    const { userId } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
       return res.status(400).json({ error: "Invalid User ID format" });
   }

    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: "Authentication required." });
    }
    const currentAdminId = req.user.user_id;

    if (userId === currentAdminId.toString() && updateData.role && updateData.role !== 'admin') {
         return res.status(403).json({ error: "Admin cannot change their own role." });
    }

    try {
         const user = await User.findById(userId);
         if (!user) {
             return res.status(404).json({ error: "User not found" });
         }

         if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
         if (updateData.middleName !== undefined) user.middleName = updateData.middleName;
         if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
         if (updateData.birthDate !== undefined) {
              try {
                  user.birthDate = new Date(updateData.birthDate);
                   if(isNaN(user.birthDate.getTime())) throw new Error("Invalid Date");
              } catch(e) {
                  return res.status(400).json({ error: "Invalid birthDate format." });
              }
         }
         if (updateData.role !== undefined && ['student', 'admin'].includes(updateData.role)) {
             user.role = updateData.role;
         }
          if (updateData.email_verified !== undefined && typeof updateData.email_verified === 'boolean') {
             user.email_verified = updateData.email_verified;
         }
          if (updateData.email || updateData.password) {
              return res.status(400).json({ error: "Email and password cannot be updated via this endpoint." });
          }

         await user.save();

         const { password, otp, otpExpiry, __v, ...updatedUserData } = user.toObject();
         res.status(200).json({ user: { ...updatedUserData, id: updatedUserData._id }, message: "User updated successfully" });

    } catch (error) {
         console.error("Error updating user:", error);
         if (error.name === 'ValidationError') {
             return res.status(400).json({ error: "Validation Error", details: error.message });
         }
         res.status(500).json({ error: "Internal server error updating user" });
    }
  },
  async adminDeleteUser(req, res) {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
       return res.status(400).json({ error: "Invalid User ID format" });
    }

    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: "Authentication required." });
    }
    const currentAdminId = req.user.user_id;

    if (userId === currentAdminId.toString()) {
         return res.status(403).json({ error: "Admin cannot delete themselves." });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(userId).session(session);
        if (!user) {
             await session.abortTransaction(); session.endSession();
            return res.status(404).json({ error: "User not found" });
        }

        const activeLoans = await Loan.countDocuments({ user: userId, returned: false }).session(session);
        if (activeLoans > 0) {
           await session.abortTransaction(); session.endSession();
           return res.status(400).json({ error: `Cannot delete user. They have ${activeLoans} book(s) currently issued.` });
        }

        await RefreshToken.deleteMany({ user: userId }).session(session);
        await Wishlist.deleteOne({ userId: userId }).session(session);
        await User.findByIdAndDelete(userId).session(session);
        await Loan.deleteMany({ user: userId }).session(session);

        await session.commitTransaction();
        res.status(200).json({ message: "User and associated data deleted successfully" });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Internal server error deleting user" });
    } finally {
        session.endSession();
    }
 },
 async adminAddBook(req, res) {
   try {
     const {
       title, author, publishDate, isbn, pages, cover, language, location, publisher, category, featured, description, totalCopies = 1
     } = req.body;

     if (!title || !author || !publishDate || !isbn || !pages || !language || !location) {
         return res.status(400).json({ error: "Missing required book fields (title, author, publishDate, isbn, pages, language, location)." });
     }

     const existingBook = await Book.findOne({ isbn: isbn });
     if (existingBook) {
       return res.status(400).json({ error: "Book with this ISBN already exists" });
     }

     const book = new Book({
         title, author, publishDate, isbn, pages, cover, language, location, publisher, category, featured, description
     });
     await book.save();

     const inventory = new BookInventory({
       isbn: book.isbn,
       title: book.title,
       author: book.author,
       totalCopies: parseInt(totalCopies, 10) || 1,
       availableCopies: parseInt(totalCopies, 10) || 1,
     });
     await inventory.save();

     res.status(201).json({ message: "Book added successfully", book });

   } catch (error) {
     console.error("Error adding book:", error);
     if (error.name === 'ValidationError') {
         return res.status(400).json({ error: "Validation Error", details: error.message });
     }
     res.status(500).json({ error: "Internal server error adding book" });
   }
 },

 async adminUpdateBook(req, res) {
   const { id } = req.params;
   const updateData = req.body;

   if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: "Invalid Book ID format" });
   }

   try {
       const book = await Book.findById(id);
       if (!book) {
         return res.status(404).json({ error: "Book not found" });
       }

       const originalIsbn = book.isbn;

       if (updateData.isbn && updateData.isbn !== originalIsbn) {
           const existingISBN = await Book.findOne({ isbn: updateData.isbn });
           if (existingISBN && existingISBN._id.toString() !== id) {
               return res.status(400).json({ error: "Cannot update to an ISBN that already exists." });
           }
       }

       Object.assign(book, updateData);
       const updatedBook = await book.save();

       const inventory = await BookInventory.findOne({ isbn: originalIsbn });
       if (inventory) {
           inventory.title = updatedBook.title;
           inventory.author = updatedBook.author;
           if (updatedBook.isbn !== originalIsbn) {
               inventory.isbn = updatedBook.isbn;
           }
           if (updateData.totalCopies !== undefined) {
               const newTotal = parseInt(updateData.totalCopies, 10);
               const diff = newTotal - inventory.totalCopies;
               inventory.totalCopies = newTotal;
               inventory.availableCopies = Math.max(0, inventory.availableCopies + diff);
               if (inventory.availableCopies > inventory.totalCopies) {
                   inventory.availableCopies = inventory.totalCopies;
               }
           }
           await inventory.save();
       } else {
            console.warn(`Inventory not found for original ISBN ${originalIsbn} during update of book ${id}.`);
       }


       res.status(200).json({ message: "Book updated successfully", book: updatedBook });

   } catch (error) {
       console.error("Error updating book:", error);
       if (error.name === 'ValidationError') {
           return res.status(400).json({ error: "Validation Error", details: error.message });
       }
       if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.isbn) {
                return res.status(400).json({ error: "ISBN already exists." });
            }
           return res.status(400).json({ error: "Duplicate key error." });
       }
       res.status(500).json({ error: "Internal server error updating book" });
   }
 },
};