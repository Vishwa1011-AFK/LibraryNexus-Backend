const mongoose = require("mongoose");

const RefreshTokenSchema = mongoose.model(
    'RefreshToken',
    new mongoose.Schema({
        token: {
            type: String,
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
    })
);

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);


module.exports = RefreshToken;
