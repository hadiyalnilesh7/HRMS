const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Order",
  new mongoose.Schema({
    items: Array,
    total: Number,
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    customerName: String,
    status: { type: String, default: "pending" },
    deliveryStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "delivered"],
    },
  }, { timestamps: true }),
);
