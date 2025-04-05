# LibraryNexus Backend API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-blue.svg)](https://nodejs.org/)
[![Project Status](https://img.shields.io/badge/Status-Active-brightgreen)]()

This repository contains the complete backend solution (Node.js/Express API) for the LibraryNexus Digital Library Management System, specifically designed for IIITM Gwalior.

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
  - [Prerequisites](#prerequisites)
  - [Steps](#steps)
  - [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
  - [Base Path](#base-path)
  - [Auth Routes](#auth-routes)
  - [Book Routes](#book-routes)
  - [User Routes](#user-routes)
  - [Wishlist Routes](#wishlist-routes)
  - [Admin Routes](#admin-routes)
- [Database Structure](#database-structure)
- [Project Structure](#project-structure)
- [Development Notes](#development-notes)
- [Known Issues & Future Plans](#known-issues--future-plans)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About the Project

LibraryNexus Backend provides the core API services for the [LibraryNexus Frontend](https://github.com/Vishwa1011-AFK/LibraryNexus). It handles user authentication, book cataloging and inventory, the borrowing and returning system, wishlist management, email notifications, and administrative operations required for managing the digital library at IIITM Gwalior.

## Features

-   **User Authentication & Management**
    -   JWT-based authentication (Access: 15m, Refresh: 30d via HttpOnly Cookie)
    -   Role-based access control (Student, Admin)
    -   IIITM Email Validation (`*@iiitm.ac.in`) and OTP Verification
    -   Secure Password Hashing (bcrypt)
    -   Password Reset Functionality via OTP

-   **Book Catalog & Inventory**
    -   Comprehensive book details storage (title, author, ISBN, cover, etc.)
    -   Advanced searching and filtering (text, category, author, availability)
    -   Separate inventory tracking for available/total copies per book title
    -   Featured book designation

-   **Loan Management System**
    -   Issuing, returning, and renewing book loans
    -   Automatic calculation of due dates (default: 14 days)
    -   Tracking of loan status (Active, Returned, Overdue)
    -   Scheduled email reminders for upcoming due dates (via node-cron)

-   **User-Specific Features**
    -   Personal Wishlist management (Add/Remove/View)
    -   View currently borrowed books
    -   View personal reading history (returned books)
    -   Profile viewing and updating

-   **Admin Capabilities**
    -   Dashboard with key library statistics
    -   Full CRUD operations for books and inventory
    -   User listing, viewing details, updating (role, status), and deletion
    -   Loan management (view all, issue, return, renew)

## Tech Stack

-   **Runtime:** Node.js
-   **Framework:** Express.js
-   **Database:** MongoDB
-   **ODM:** Mongoose
-   **Authentication:** JSON Web Tokens (JWT - `jsonwebtoken`)
-   **Password Hashing:** `bcrypt.js`
-   **Validation:** Zod
-   **Email Service:** Nodemailer (using Gmail SMTP in example)
-   **Scheduling:** `node-cron` (for email reminders)
-   **Middleware:** CORS, Cookie Parser, Body Parser, Custom Auth/Admin checks

## Installation & Setup

### Prerequisites

-   Node.js (v18.0.0 or later recommended)
-   npm or yarn
-   MongoDB instance (local or cloud-hosted like MongoDB Atlas)
-   Git
-   An email account (like Gmail) configured for sending emails programmatically (e.g., using an App Password if 2FA is enabled).

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Vishwa1011-AFK/LibraryNexus-Backend.git
    cd LibraryNexus-Backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Create Environment File:**
    Create a `.env` file in the root directory. You can copy `.env.example` if it exists, or use the template below.

4.  **Configure Environment Variables:**
    Fill in the necessary values in your `.env` file (see details in the next section).

5.  **Start the Development Server:**
    ```bash
    # Uses nodemon specified in package.json for auto-restarts
    npm start
    ```
    The server should now be running, typically on the port specified in your `.env` file (e.g., `http://localhost:5000`).

### Environment Variables

Create a `.env` file in the root directory with the following structure. **Never commit your `.env` file to version control. @_@**

```env
# --- Database Configuration ---
# Your MongoDB connection string
DB_URL="mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority"

# --- Server Configuration ---
# Port the backend server will run on
PORT=5000

# --- Email Configuration (for Nodemailer) ---
# Email address used to send emails (e.g., OTPs, reminders)
APP_EMAIL="your-librarynexus-email@gmail.com"
# App-specific password for the email account (recommended for Gmail with 2FA)
APP_PASSWORD="your_gmail_app_password"
# Optional: Specify email service if not Gmail (e.g., SendGrid)
# EMAIL_SERVICE=smtp.sendgrid.net

# --- JWT Authentication Secrets ---
# Use strong, random strings for these secrets
ACCESS_TOKEN_SECRET="your_very_strong_random_access_token_secret"
REFRESH_TOKEN_SECRET="your_even_stronger_random_refresh_token_secret"

# --- Application Settings ---
# Timezone for server operations, especially scheduling (e.g., Asia/Kolkata, UTC)
TZ=Asia/Kolkata
# A secret code required during signup to register an admin user
ADMIN_SIGNUP_CODE="make_this_a_secure_unguessable_code"
# The exact URL of your running frontend application (for CORS)
FRONTEND_URL="http://localhost:3000"
```

Notes:
- For Gmail, you'll likely need to enable 2FA and generate an "App Password" to use in APP_PASSWORD.
- Ensure FRONTEND_URL matches exactly where your LibraryNexus frontend is running to allow requests from it.

## API Documentation

### Base Path

All API routes are prefixed with `/api`.

### Auth Routes

Base: `/api/auth`

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|--------------|
| /signup | POST | Register a new user | No |
| /signin | POST | User login, issues tokens | No |
| /token | POST | Refresh access token | Yes (Refresh Token Cookie) |
| /logout | POST | Logout user, clears token | Yes |
| /signup-otp | POST | Request email verification OTP | No |
| /verify-signup | POST | Verify email with OTP | No |
| /forgot | POST | Request password reset OTP | No |
| /verify-reset | POST | Reset password using OTP | No |

### Book Routes

Base: `/api`

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|--------------|
| /books | GET | Search/filter books (public view) | No |
| /books/:id | GET | Get specific book details | No |
| /categories | GET | Get distinct book categories | No |
| /authors | GET | Get distinct book authors | No |

### User Routes

Base: `/api/users` (Requires Access Token)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /me | GET | Get current user profile |
| /me | PATCH | Update current user profile |
| /me/password | PUT | Change current user password |
| /me/borrowed-books | GET | List currently borrowed books |
| /me/reading-history | GET | View reading history |

### Wishlist Routes

Base: `/api/users/wishlist` (Requires Access Token)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /me | GET | Get user's wishlist |
| /me/:bookId | POST | Add book to wishlist |
| /me/:bookId | DELETE | Remove book from wishlist |

### Admin Routes

Base: `/api/admin` (Requires Admin Role & Access Token)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /dashboard-stats | GET | Get dashboard statistics |
| /books | GET | List all books (admin view) |
| /books | POST | Add a new book & inventory |
| /books/:id | GET | Get book details (admin view) |
| /books/:id | PUT | Update a book & its inventory |
| /books/:id | DELETE | Delete a book & related data |
| /loans | GET | List all loans (filterable) |
| /loans/issue/:bookId | POST | Issue book to a specified user |
| /loans/return/:loanId | POST | Mark a loan as returned |
| /loans/renew/:loanId | POST | Renew an existing loan |
| /users | GET | List all registered users |
| /users/:userId | GET | Get specific user details |
| /users/:userId | PUT | Update user details (role, etc.) |
| /users/:userId | DELETE | Delete a user & associated data |

## Database Structure

(Note: This ASCII diagram provides a basic overview. Relationships are implied.)

```
┌─────────────────────────┐          ┌───────────────────────────┐
│          User (UserInfo)│          │           Book            │
├─────────────────────────┤          ├───────────────────────────┤
│ _id: ObjectId           │          │ _id: ObjectId             │
│ firstName: String       │          │ title: String             │
│ middleName: String      │          │ author: String            │
│ lastName: String        │          │ publishDate: String       │
│ email: String           │          │ isbn: String (Unique)     │
│ email_verified: Boolean │          │ pages: Number             │
│ password: String (Hash) │          │ cover: String (URL)       │
│ birthDate: Date         │          │ language: String          │
│ otp: String             │          │ location: String          │
│ otpExpiry: Date         │          │ publisher: String         │
│ role: String (Enum)     │          │ category: String          │
└──────────┬──────────────┘          │ featured: Boolean         │
           │ (Ref: user)             │ description: String       │
           │                         └─────────────┬─────────────┘
           │                                       │ (Ref: isbn)
┌──────────▼──────────────┐          ┌─────────────▼─────────────┐
│      RefreshToken       │          │       BookInventory       │
├─────────────────────────┤          ├───────────────────────────┤
│ _id: ObjectId           │          │ _id: ObjectId             │
│ token: String           │          │ isbn: String (Unique)     │
│ user: ObjectId          │          │ title: String             │
│ expiryDate: Date        │          │ author: String            │
└─────────────────────────┘          │ totalCopies: Number       │
                                     │ availableCopies: Number   │
                                     └───────────────────────────┘

┌─────────────────────────┐          ┌───────────────────────────┐
│       Wishlist          │          │          Loan             │
├─────────────────────────┤          ├───────────────────────────┤
│ _id: ObjectId           │          │ _id: ObjectId             │
│ userId: ObjectId (Unique)│         │ user: ObjectId (Ref: User)│
│ books: Array [          │          │ book: ObjectId (Ref: Book)│
│   {                     │          │ issueDate: Date           │
│     bookId: ObjectId    │          │ returnDate: Date          │
│     addedAt: Date       │          │ returned: Boolean         │
│   }                     │          │ actualReturnDate: Date    │
│ ]                       │          └───────────────────────────┘
└─────────────────────────┘
```

## Project Structure

```
LibraryNexus-Backend/
├── controllers/        # Route handlers containing business logic
├── database/           # Database connection setup (db.js)
├── mailing_objects/    # HTML templates and assets for emails
├── middleware/         # Custom Express middleware (auth, admin checks)
├── models/             # Mongoose schemas defining data structures
├── routes/             # API route definitions linking paths to controllers
├── services/           # Reusable logic modules (e.g., user lookups, email validation)
├── utils/              # Helper functions (e.g., OTP generation)
├── .env                # Environment variables (ignored by Git)
├── .env.example        # Example environment file template (optional)
├── .gitignore          # Specifies intentionally untracked files
├── app.js              # Express application entry point and setup
├── LICENSE             # Project license file
├── package.json        # Node.js project manifest and dependencies
└── README.md           # This file
```

## Development Notes

- The backend is built with a modular structure (routes, controllers, services, models) to promote separation of concerns and maintainability.
- Authentication leverages JWT with short-lived access tokens and longer-lived, HttpOnly refresh tokens for enhanced security.
- Email validation is specifically tailored for the IIITM domain (*@iiitm.ac.in) using Zod and regex.
- Zod is used for robust request body validation, providing type safety and clear error messages.
- Error handling includes a global middleware for catching unhandled errors and returning standardized JSON responses.

## Known Issues & Future Plans

- Implement pagination for main listing endpoints (/books, /admin/books, /admin/loans, /admin/users, /me/reading-history). (Note: Verify implementation completeness)
- Add comprehensive unit and integration tests (e.g., using Jest/Supertest).
- Develop a book bulk import feature (e.g., from CSV).
- Explore adding a GraphQL API endpoint alongside REST.
- Create a Docker configuration (Dockerfile, docker-compose.yml) for easier deployment and environment consistency.
- Implement functionality for users/admins to upload book cover images instead of relying solely on URLs.
- Add i18n support for email templates and potentially API responses.
- Refine error handling for more specific error codes and messages.

## Contributing

Contributions are welcome! Please follow standard Git workflow:

1. Fork the repository (Vishwa1011-AFK/LibraryNexus-Backend).
2. Create a new branch (git checkout -b feature/your-feature-name or bugfix/issue-fix).
3. Make your changes and commit them with clear messages.
4. Push your changes to your fork (git push origin feature/your-feature-name).
5. Open a Pull Request to the main branch of the original repository (Vishwa1011-AFK/LibraryNexus-Backend).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Vishwa Patel - GitHub [@Vishwa1011-AFK](https://github.com/Vishwa1011-AFK) - librarynexushq@gmail.com
