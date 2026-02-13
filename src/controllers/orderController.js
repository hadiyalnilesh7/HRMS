const Order = require("../models/Order");
const Menu = require("../models/Menu");
const Booking = require("../models/Booking");

exports.orderPage = async (req, res) => {
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

  res.render("order", {
    pendingOrders,
    deliveredOrders,
    currentPage: "order",
    menu,
    bookings,
    customerName: customerName || undefined,
  });
};

exports.addOrder = async (req, res) => {
  const { items, room, customerName } = req.body;

  // Parse item IDs from comma-separated string
  const itemIds = items
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id);

  // Get menu items from database
  const ownerId = req.session && req.session.user ? req.session.user.id : null;
  const menuItems = await Menu.find({ _id: { $in: itemIds }, owner: ownerId });

  if (itemIds.length === 0) {
    return res.redirect("/order");
  }

  // Calculate total amount from menu item prices
  const total = menuItems.reduce((sum, item) => sum + item.price, 0);

  await Order.create({
    items: menuItems,
    total,
    room: room || null,
    customerName: customerName || "Guest",
    deliveryStatus: "pending",
    owner: ownerId,
  });

  res.redirect("/order");
};

exports.updateDeliveryStatus = async (req, res) => {
  const { orderId } = req.params;
  const { deliveryStatus } = req.body;

  const ownerId = req.session && req.session.user ? req.session.user.id : null;
  await Order.findOneAndUpdate(
    { _id: orderId, owner: ownerId },
    { deliveryStatus },
  );

  res.redirect("/order");
};
