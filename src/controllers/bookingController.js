const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Order = require("../models/Order");

exports.listBooking = async (req, res) => {
  const ownerId = req.session && req.session.user ? req.session.user.id : null;
  try {
    const booking = await Booking.find({ owner: ownerId }).populate("room");
    const availableRooms = await Room.find({ status: "available", owner: ownerId });
    const activeBookings = booking.filter((b) => b.status !== "checked-out");
    const bookingCount = activeBookings.length;
    const checkoutSummary = req.session.checkoutSummary || null;
    delete req.session.checkoutSummary;

    // date range filtering
    const from = (req.query.from || "").trim();
    const to = (req.query.to || "").trim();

    let checkedOut = booking.filter((b) => b.status === "checked-out");
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23,59,59,999);
      checkedOut = await Booking.find({ owner: ownerId, status: "checked-out", actualCheckOut: { $gte: fromDate, $lte: toDate } }).populate("room").sort({ actualCheckOut: -1 });
    } else {
      // show all checked-out bookings, latest first
      checkedOut = await Booking.find({ owner: ownerId, status: "checked-out" }).populate("room").sort({ actualCheckOut: -1 });
    }

    res.render("booking", {
      booking: booking,
      availableRooms: availableRooms || [],
      currentPage: "booking",
      bookingCount,
      checkoutSummary,
      user: req.session.user || null,
      checkedOutBookings: checkedOut,
      from: from || undefined,
      to: to || undefined
    });
  } catch (error) {
    console.log("Error fetching booking", error);
    const booking = await Booking.find({ owner: ownerId }).populate("room");

    res.render("booking", {
      booking,
      availableRooms: [],
      currentPage: "booking",
      bookingCount: booking.length,
      checkoutSummary: null,
      user: req.session.user || null,
      checkedOutBookings: [],
      from: undefined,
      to: undefined
    });
  }
};

exports.addBooking = async (req, res) => {
  const { customerName, customerNumber, room, checkIn, checkOut } = req.body;
  const ownerId = req.session && req.session.user ? req.session.user.id : null;
  const roomData = await Room.findOne({ _id: room, owner: ownerId });
  if (!roomData) return res.status(404).send("Room not found");
  const days = Math.max(
    1,
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
  );
  const totalAmount = days * roomData.pricePerNight;

  // Handle uploaded file - store the filename/path
  let customerImage = null;
  if (req.file) {
    customerImage = `/uploads/${ownerId}/${req.file.filename}`;
  }

  await Booking.create({
    customerName,
    customerNumber,
    customerImage,
    room,
    checkIn,
    checkOut,
    totalAmount,
    owner: ownerId
  });

  roomData.status = "occupied";
  await roomData.save();

  res.redirect("/booking");
};

exports.checkInBooking = async (req, res) => {
  const { bookingId } = req.params;

  const ownerId = req.session && req.session.user ? req.session.user.id : null;
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, owner: ownerId },
    { status: "checked-in", actualCheckIn: new Date() },
    { new: true },
  );

  if (!booking) return res.status(404).send("Booking not found");

  res.redirect("/booking");
};

exports.checkOutBooking = async (req, res) => {
  const { bookingId } = req.params;
  const ownerId = req.session && req.session.user ? req.session.user.id : null;
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, owner: ownerId },
    { status: "checked-out", actualCheckOut: new Date() },
    { new: true },
  ).populate("room");

  if (!booking) return res.status(404).send("Booking not found");
  const roomId = booking.room && booking.room._id ? booking.room._id : booking.room;

  const room = await Room.findOneAndUpdate({ _id: roomId, owner: ownerId }, { status: "available" });

  // Get all orders for this booking (by booking ID or room ID with delivered status)
  const orders = await Order.find({
    $or: [
      { booking: bookingId, owner: ownerId },
      { room: roomId, deliveryStatus: "delivered", owner: ownerId }
    ]
  });
  const foodCharges = orders.reduce((sum, order) => sum + order.total, 0);
  const totalWithFood = booking.totalAmount + foodCharges;

  // Calculate original room charges (total without food)
  const originalRoomCharges = booking.totalAmount - (booking.foodCharges || 0);
  
  // Update booking with food charges and total amount
  await Booking.findByIdAndUpdate(bookingId, { 
    foodCharges: foodCharges,
    totalAmount: originalRoomCharges + foodCharges
  });

  // Build list of food items from all orders
  const foodItems = [];
  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        foodItems.push({
          name: item.name,
          price: item.price,
          quantity: 1
        });
      });
    }
  });

  // Store checkout summary in session (single-use)
  const actualCheckOutTime = new Date();
  req.session.checkoutSummary = {
    customerName: booking.customerName,
    roomNumber: booking.room.roomNo,
    roomCharges: originalRoomCharges,
    foodCharges: foodCharges,
    foodItems: foodItems,
    totalAmount: originalRoomCharges + foodCharges,
    checkOutDate: actualCheckOutTime.toLocaleDateString(),
    checkOutTime: actualCheckOutTime.toLocaleTimeString()
  };

  // Fetch all bookings to pass to view
  try {
    const allBookings = await Booking.find({ owner: ownerId }).populate("room");
    const availableRooms = await Room.find({ status: "available", owner: ownerId });
    const activeBookings = allBookings.filter((b) => b.status !== "checked-out");
    const bookingCount = activeBookings.length;

    // date range filtering for checked-out (history)
    const from = (req.query.from || "").trim();
    const to = (req.query.to || "").trim();

    let checkedOut = allBookings.filter((b) => b.status === "checked-out");
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23,59,59,999);
      checkedOut = await Booking.find({ owner: ownerId, status: "checked-out", actualCheckOut: { $gte: fromDate, $lte: toDate } }).populate("room").sort({ actualCheckOut: -1 });
    } else {
      // show all checked-out bookings, latest first
      checkedOut = await Booking.find({ owner: ownerId, status: "checked-out" }).populate("room").sort({ actualCheckOut: -1 });
    }

    res.render("booking", {
      booking: allBookings,
      availableRooms: availableRooms || [],
      currentPage: "booking",
      bookingCount,
      checkoutSummary: req.session.checkoutSummary,
      user: req.session.user || null,
      checkedOutBookings: checkedOut,
      from: from || undefined,
      to: to || undefined
    });
  } catch (error) {
    console.log("Error fetching booking after checkout", error);
    res.redirect("/booking");
  }
};
