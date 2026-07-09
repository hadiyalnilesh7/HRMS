const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Order = require("../models/Order");
const ensureDBConnection = require("../config/dbGuard");

exports.listBooking = async (req, res) => {
  try {
    await ensureDBConnection();

    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    // Only fetch active bookings
    const activeBookingsQuery = { 
      owner: ownerId, 
      status: { $ne: "checked-out" } 
    };
    // Fetch active bookings
    const booking = await Booking.find(activeBookingsQuery).populate("room").sort({ checkIn: 1 });
    // Fetch available rooms
    const availableRooms = await Room.find({ status: "available", owner: ownerId });
    const bookingCount = booking.length;
    // Handle checkout summary
    const checkoutSummary = req.session.checkoutSummary || null;
    delete req.session.checkoutSummary;

    // Date range filtering for checked-out bookings
    const from = (req.query.from || "").trim();
    const to = (req.query.to || "").trim();

    let checkedOut = [];
    
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      
      // Fetch history with range filter
      checkedOut = await Booking.find({ 
        owner: ownerId, 
        status: "checked-out", 
        actualCheckOut: { $gte: fromDate, $lte: toDate } 
      })
      .populate("room")
      .sort({ actualCheckOut: -1 });
      
    } else {
      // show last 10 checked-out bookings
      checkedOut = await Booking.find({ 
        owner: ownerId, 
        status: "checked-out" 
      })
      .populate("room")
      .sort({ actualCheckOut: -1 })
      .limit(10);
    }

    res.render("booking", {
      booking: booking, // This now contains only ACTIVE bookings + checked-in/pending
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
    console.error("Error fetching booking:", error);
    
    res.render("booking", {
      booking: [],
      availableRooms: [],
      currentPage: "booking",
      bookingCount: 0,
      checkoutSummary: null,
      user: req.session.user || null,
      checkedOutBookings: [],
      from: undefined,
      to: undefined,
      user: req.session.user || null,
    });
  }
};

exports.addBooking = async (req, res) => {
  try {
    await ensureDBConnection();

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
      customerImage = req.file.path || req.file.filename;
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

    return res.redirect("/booking");
  } catch (error) {
    console.error("Error adding booking:", error);
    return res.redirect("/booking");
  }
};

exports.checkInBooking = async (req, res) => {
  const { bookingId } = req.params;

  try {
    await ensureDBConnection();

    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, owner: ownerId },
      { status: "checked-in", actualCheckIn: new Date() },
      { new: true },
    );

    if (!booking) return res.status(404).send("Booking not found");

    return res.redirect("/booking");
  } catch (error) {
    console.error("Error checking in booking:", error);
    return res.redirect("/booking");
  }
};

exports.checkOutBooking = async (req, res) => {
  const { bookingId } = req.params;
  try {
    await ensureDBConnection();

    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, owner: ownerId },
      { status: "checked-out", actualCheckOut: new Date() },
      { new: true },
    ).populate("room");

    if (!booking) return res.status(404).send("Booking not found");
    const roomId = booking.room && booking.room._id ? booking.room._id : booking.room;

    const room = await Room.findOneAndUpdate({ _id: roomId, owner: ownerId }, { status: "cleaning" });

    // Calculate actual check-in and check-out times
    const actualCheckInTime = booking.actualCheckIn ? new Date(booking.actualCheckIn) : new Date(booking.checkIn);
    const actualCheckOutTime = new Date();

    // Calculate actual nights stay
    const nightsStayed = Math.max(1, Math.ceil((actualCheckOutTime - actualCheckInTime) / (1000 * 60 * 60 * 24)));
    const pricePerNight = room && room.pricePerNight ? room.pricePerNight : 0;

    const actualRoomCharges = nightsStayed * pricePerNight;

    const orders = await Order.find({
      $or: [
        { booking: bookingId, owner: ownerId },
        { 
          room: roomId, 
          deliveryStatus: "delivered", 
          owner: ownerId,
          createdAt: { $gte: actualCheckInTime }
        }
      ]
    });
  const foodCharges = orders.reduce((sum, order) => sum + order.total, 0);
  
  // Update booking with food charges and total amount
  await Booking.findByIdAndUpdate(bookingId, { 
    foodCharges: foodCharges,
    totalAmount: actualRoomCharges + foodCharges
  });

  const foodItemsMap = new Map();
  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const itemId = item._id ? item._id.toString() : item.name;
        if (foodItemsMap.has(itemId)) {
          const existing = foodItemsMap.get(itemId);
          existing.quantity += 1;
          existing.price += item.price; 
        } else {
          foodItemsMap.set(itemId, {
            name: item.name,
            price: item.price,
            quantity: 1
          });
        }
      });
    }
  });
  const foodItems = Array.from(foodItemsMap.values());

  // Store checkout summary in session (single-use)
  req.session.checkoutSummary = {
    customerName: booking.customerName,
    roomNumber: booking.room.roomNo,
    roomCharges: actualRoomCharges,
    foodCharges: foodCharges,
    foodItems: foodItems,
    totalAmount: actualRoomCharges + foodCharges,
    checkInDate: actualCheckInTime.toLocaleDateString(),
    checkInTime: actualCheckInTime.toLocaleTimeString(),
    nightsStayed: nightsStayed,
    checkOutDate: actualCheckOutTime.toLocaleDateString(),
    checkOutTime: actualCheckOutTime.toLocaleTimeString()
  };

    return res.redirect("/booking");
  } catch (error) {
    console.error("Error checking out booking:", error);
    return res.redirect("/booking");
  }
};
