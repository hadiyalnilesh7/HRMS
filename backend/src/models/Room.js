const mongoose = require("mongoose");

module.exports = mongoose.model("Room", new mongoose.Schema({
    roomNo : String,
    type : String,
    pricePerNight: Number,
    status: {
      type: String,
      default: "available",
      enum: ["available", "occupied", "cleaning"],
      index: true
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    features: [String],
    images: [String],
}));