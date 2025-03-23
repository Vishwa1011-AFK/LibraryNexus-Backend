const { z } = require("zod");

const emailPattern = /^[\w-]+(\.[\w-]+)*@iiitm\.ac\.in$/;

const emailSchema = z.string().regex(emailPattern, {
  message: "Invalid email format. Expected format: *@iiitm.ac.in",
});

function validateEmail(email) {
  try {
    emailSchema.parse(email);
    return { valid: true, message: "Email is valid" };
  } catch (error) {
    return { valid: false, message: error.errors[0].message };
  }
}

module.exports = { validateEmail };
