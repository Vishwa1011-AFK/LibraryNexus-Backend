require("dotenv").config();
const mongoose = require("mongoose");
const db_connectionString = process.env.DB_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(db_connectionString);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
