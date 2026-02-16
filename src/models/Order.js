const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Order",
  new mongoose.Schema({
    items: Array,
    total: Number,
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", index: true },
    customerName: String,
    status: { type: String, default: "pending" },
    deliveryStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "delivered"],
      index: true
    },
  }, { timestamps: true }),
);
