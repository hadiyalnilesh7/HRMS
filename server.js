const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const connectDB = require("./src/config/db");
const upload = require("./src/config/multerConfig");
const Booking = require("./src/models/Booking");
const Order = require("./src/models/Order");
const Room = require("./src/models/Room");

const app = express();
connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  name: "hrms-session",
  secret: process.env.SESSION_SECRET || "devsecret",
  resave: false,
  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,  
    collectionName: "sessions",
  }),

  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.upload = upload; // Make upload middleware available
  next();
});

app.use("/", require("./src/routes/authRoutes"));
app.use("/rooms", require("./src/routes/roomRoutes"));
app.use("/booking", require("./src/routes/bookingRoutes"));
app.use("/menu", require("./src/routes/menuRoutes"));
app.use("/order", require("./src/routes/orderRoutes"));
app.use("/settings", require("./src/routes/settingsRoutes"));

app.get("/dashboard", async (req, res) => {
  const ownerId = req.session && req.session.user ? req.session.user.id : null;

  const allBookings = await Booking.find({ owner: ownerId });
  const activeBookings = allBookings.filter((b) => b.status !== "checked-out");
  const bookingsCount = activeBookings.length;
  const pendingOrdersCount = await Order.countDocuments({
    deliveryStatus: "pending",
    owner: ownerId,
  });
  const roomsCount = await Room.countDocuments({ owner: ownerId });
  const availableRooms = await Room.countDocuments({ owner: ownerId, status: "available" });

  res.render("dashboard", {
    currentPage: "dashboard",
    bookingsCount,
    pendingOrdersCount,
    roomsCount,
    availableRooms,
    user: req.session.user || null,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is Running on port ${PORT}`);
});
