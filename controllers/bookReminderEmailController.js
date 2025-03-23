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

async function sendReminderEmail(email, bookId, returnDate) {
    try {
        const book = await Book.findById(bookId);

        if (!book) {
            console.error(`Book with ID ${bookId} not found.`);
            return;
        }

        const templatePath = path.join(
            __dirname,
            "../mailing_objects/bookReminderEmail.html"
        );
        let emailHtml = fs.readFileSync(templatePath, "utf8");

        emailHtml = emailHtml
            .replace("{coverPhoto}", book.cover)
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
                    path: path.join(__dirname, "../mailing_objects/logo.png"),
                    cid: "logo1.xyz",
                },
            ],
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(`Error sending reminder email for book ${bookId} to ${email}:`, error);
            }
            console.log(`Reminder email sent successfully for book ${bookId} to ${email}:`, info.response);
        });
    } catch (error) {
        console.error(`Error preparing reminder email for book ${bookId} to ${email}:`, error);
    }
}

async function scheduleEmailReminder(email, bookId, returnDate) {
    try {
        const book = await Book.findById(bookId);
        if (!book) {
            console.error(`Book with ID ${bookId} not found.`);
            return;
        }

        const reminderDate = new Date(returnDate);
        reminderDate.setDate(reminderDate.getDate() - 1);

        const cronSchedule = `${reminderDate.getMinutes()} ${reminderDate.getHours()} ${reminderDate.getDate()} ${reminderDate.getMonth() + 1} *`;

        const timezone = process.env.TZ || 'Asia/Kolkata'; 
        cron.schedule(cronSchedule, () => {
          sendReminderEmail(email, bookId, returnDate);
        }, {
          scheduled: true,
          timezone: timezone
        });

        console.log(`Reminder scheduled for ${email} on ${reminderDate}`);

    } catch (error) {
        console.error("Error scheduling reminder:", error);
    }
}

module.exports = { scheduleEmailReminder };