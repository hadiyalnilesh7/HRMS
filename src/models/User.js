const mongoose = require("mongoose");

module.exports = mongoose.model("User", new mongoose.Schema({
    name : String,
    email : String,
    hotelName : String,
    password : String,
    selectedRoomTypes: { type: [String], default: [] },
    selectedMenuCategories: { type: [String], default: [] },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null }
}));