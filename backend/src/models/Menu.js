const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Menu",
  new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  }),
);
