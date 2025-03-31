const { z } = require("zod");
const mongoose = require("mongoose");

const userSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  middleName: z.string().optional(),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid birth date",
  }),
  adminCode: z.string().optional(),
});

module.exports = { userSchema };
