const express = require("express");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const connectDB = require("./src/config/db");
const adminAuth = require("./src/middlewares/middleware");
const Booking = require("./src/models/Booking");
const Order = require("./src/models/Order");
const Room = require("./src/models/Room");

const SESSION_COOKIE_NAME = "hrms-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24;

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, pair) => {
    const index = pair.indexOf("=");
    if (index === -1) {
      return cookies;
    }

    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (name) {
      cookies[name] = value;
    }

    return cookies;
  }, {});
}

function signSessionPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSession(user, secret) {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  const signature = signSessionPayload(payload, secret);
  return `${payload}.${signature}`;
}

function decodeSession(token, secret) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  const expectedSignature = signSessionPayload(payload, secret);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function buildSessionCookie(token, isProduction) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];

  if (isProduction) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function buildClearedSessionCookie(isProduction) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (isProduction) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

const app = express();
connectDB().catch((err) => {
  console.error("Initial MongoDB connection attempt failed:", err);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  const sessionSecret = process.env.SESSION_SECRET || "devsecret";
  const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
  const cookies = parseCookies(req.headers.cookie || "");
  const session = {
    destroy(callback) {
      req.session.user = null;
      res.setHeader("Set-Cookie", buildClearedSessionCookie(isProduction));
      if (callback) {
        callback();
      }
    },
    save(callback) {
      if (req.session.user) {
        const token = encodeSession(req.session.user, sessionSecret);
        res.setHeader("Set-Cookie", buildSessionCookie(token, isProduction));
      }

      if (callback) {
        callback();
      }
    },
  };

  Object.defineProperty(session, "user", {
    configurable: true,
    enumerable: true,
    get() {
      return session._user || null;
    },
    set(value) {
      session._user = value || null;
      if (session._user) {
        const token = encodeSession(session._user, sessionSecret);
        res.setHeader("Set-Cookie", buildSessionCookie(token, isProduction));
      } else {
        res.setHeader("Set-Cookie", buildClearedSessionCookie(isProduction));
      }
    },
  });

  session._user = decodeSession(cookies[SESSION_COOKIE_NAME], sessionSecret);
  req.session = session;

  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));
app.use(express.static(path.join(__dirname, "../frontend/public")));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use("/", require("./src/routes/authRoutes"));
app.use("/rooms", require("./src/routes/roomRoutes"));
app.use("/booking", require("./src/routes/bookingRoutes"));
app.use("/menu", require("./src/routes/menuRoutes"));
app.use("/order", require("./src/routes/orderRoutes"));
app.use("/settings", require("./src/routes/settingsRoutes"));

app.get("/dashboard", adminAuth, async (req, res) => {
  const ownerId = req.session && req.session.user ? req.session.user.id : null;

  // Optimized: Count active bookings directly in DB
  const bookingsCount = await Booking.countDocuments({ 
    owner: ownerId, 
    status: { $ne: "checked-out" } 
  });
  const pendingOrdersCount = await Order.countDocuments({
    deliveryStatus: "pending",
    owner: ownerId,
  });
  const roomsCount = await Room.countDocuments({ owner: ownerId });
  const availableRooms = await Room.countDocuments({ owner: ownerId, status: "available" });
  
  // Fetch rooms that need cleaning
  const roomsNeedingCleaning = await Room.find({ owner: ownerId, status: "cleaning" }).sort({ roomNo: 1 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const dailyBookings = await Booking.find({
    owner: ownerId,
    status: "checked-out",
    actualCheckOut: { $gte: today, $lt: tomorrow }
  });
  const todayRevenue = dailyBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const monthlyBookings = await Booking.find({
    owner: ownerId,
    status: "checked-out",
    actualCheckOut: { $gte: firstDayOfMonth, $lt: nextMonth }
  });
  const monthRevenue = monthlyBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  res.render("dashboard", {
    currentPage: "dashboard",
    bookingsCount,
    pendingOrdersCount,
    roomsCount,
    availableRooms,
    roomsNeedingCleaning,
    todayRevenue,
    monthRevenue,
    user: req.session.user || null,
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is Running on port ${PORT}`);
  });
}

module.exports = app;
