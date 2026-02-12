const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Booking",
  new mongoose.Schema({
    customerName: String,
    customerNumber: String,
    customerImage: String,
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    checkIn: Date,
    checkOut: Date,
    actualCheckIn: Date,
    actualCheckOut: Date,
    totalAmount: Number,
    foodCharges: { type: Number, default: 0 },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "checked-in", "checked-out"],
    },
  }),
);
