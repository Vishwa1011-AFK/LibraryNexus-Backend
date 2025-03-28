const mongoose = require("mongoose");

const refreshTokenSchemaDefinition = new mongoose.Schema({
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
});

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchemaDefinition);

module.exports = RefreshToken;
