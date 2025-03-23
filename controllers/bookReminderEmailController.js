const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const Book = require("../models/Books");
const appEmail = process.env.APP_EMAIL;
const appPassword = process.env.APP_PASSWORD;
const cron = require('node-cron');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: appEmail,
    pass: appPassword,
  },
});

async function scheduleEmailReminder(email, bookId, returnDate) {
  const book = await Book.findById(bookId);

  const reminderDate = new Date(returnDate);
  reminderDate.setDate(reminderDate.getDate() - 1);

  const timeUntilReminder = reminderDate.getTime() - Date.now();
  if (timeUntilReminder > 0) {
    setTimeout(async () => {
      const templatePath = path.join(
        __dirname,
        "../mailing_objects/bookReminderEmail.html"
      );
      let emailHtml = fs.readFileSync(templatePath, "utf8");

      emailHtml = emailHtml
        .replace("{coverPhoto}", book.coverPhoto)
        .replace("{bookTitle}", book.title)
        .replace("{bookAuthor}", book.author)
        .replace("{returnDate}", new Date(returnDate).toDateString());

      const mailOptions = {
        from: appEmail,
        to: email,
        subject: "Book Return Reminder",
        html: emailHtml,
        attachments: [
          {
            filename: "logo.png",
            path: "../mailing_objects/logo.png",
            cid: "logo1.xyz",
          },
        ],
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Reminder email sent: " + info.response);
      });
    }, timeUntilReminder);
  }
}

module.exports = { scheduleEmailReminder };
