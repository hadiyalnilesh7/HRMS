const Order = require("../models/Order");
const Menu = require("../models/Menu");
const Booking = require("../models/Booking");
const ensureDBConnection = require("../config/dbGuard");

exports.orderPage = async (req, res) => {
  try {
    await ensureDBConnection();

    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    const menu = await Menu.find({ owner: ownerId });
    const bookings = await Booking.find({
      owner: ownerId,
      status: "checked-in",
    }).populate("room");

    // Name-wise filtering
    const customerName = (req.query.customerName || "").trim();

    const pendingOrders = await Order.find({
      owner: ownerId,
      deliveryStatus: "pending",
    })
      .populate("room")
      .populate("booking");

    let deliveredOrders = [];
    if (customerName) {
      deliveredOrders = await Order.find({
        owner: ownerId,
        deliveryStatus: "delivered",
        customerName: { $regex: customerName, $options: "i" },
      })
        .populate("room")
        .populate("booking")
        .sort({ createdAt: -1 });
    } else {
      deliveredOrders = await Order.find({
        owner: ownerId,
        deliveryStatus: "delivered",
      })
        .populate("room")
        .populate("booking")
        .sort({ createdAt: -1, _id: -1 })
        .limit(5);
    }

    return res.render("order", {
      pendingOrders,
      deliveredOrders,
      currentPage: "order",
      menu,
      bookings,
      customerName: customerName || undefined,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Error loading order page:", error);
    return res.status(500).render("order", {
      pendingOrders: [],
      deliveredOrders: [],
      currentPage: "order",
      menu: [],
      bookings: [],
      customerName: undefined,
      user: req.session.user || null,
    });
  }
};

exports.addOrder = async (req, res) => {
  try {
    await ensureDBConnection();

    const { items, room, customerName } = req.body;

    // Parse item IDs from comma-separated string
    const itemIds = items
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    // Get menu items from database
    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    const uniqueItems = await Menu.find({ _id: { $in: itemIds }, owner: ownerId });

  // Map unique items for quick lookup
  const itemMap = new Map();
  uniqueItems.forEach(item => itemMap.set(item._id.toString(), item));

  // Reconstruct full list of items (including duplicates for quantity)
  const finalItems = [];
  let total = 0;

  itemIds.forEach(id => {
    const item = itemMap.get(id);
    if (item) {
      finalItems.push(item);
      total += item.price;
    }
  });

    if (finalItems.length === 0) {
      return res.redirect("/order");
    }

  // Find active booking for this room to link the order
    const activeBooking = room ? await Booking.findOne({ 
      room: room, 
      status: { $ne: "checked-out" }, 
      owner: ownerId 
    }) : null;

    await Order.create({
      items: finalItems,
      total,
      room: room || null,
      booking: activeBooking ? activeBooking._id : null,
      customerName: customerName || (activeBooking ? activeBooking.customerName : "Guest"),
      deliveryStatus: "pending",
      owner: ownerId,
    });

    return res.redirect("/order");
  } catch (error) {
    console.error("Error adding order:", error);
    return res.redirect("/order");
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    await ensureDBConnection();

    const { orderId } = req.params;
    const { deliveryStatus } = req.body;

    const ownerId = req.session && req.session.user ? req.session.user.id : null;
    await Order.findOneAndUpdate(
      { _id: orderId, owner: ownerId },
      { deliveryStatus },
    );

    return res.redirect("/order");
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return res.redirect("/order");
  }
};
