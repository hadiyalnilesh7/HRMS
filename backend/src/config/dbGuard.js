const connectDB = require("./db");

module.exports = async function ensureDBConnection() {
  const connection = await connectDB();

  if (connection === null && process.env.MONGO_URL) {
    throw new Error("Unable to connect to MongoDB. Check the Vercel MONGO_URL value and Atlas network access.");
  }

  if (connection === null && (!process.env.MONGO_URL || process.env.MONGO_URL.trim() === "")) {
    throw new Error("MONGO_URL is missing in the Vercel environment.");
  }

  return connection;
};