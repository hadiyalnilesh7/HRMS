const mongoose = require("mongoose");

module.exports = mongoose.model("Room", new mongoose.Schema({
    roomNo : String,
    type : String,
    pricePerNight : Number,
    status : { type : String, default : "available" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}));