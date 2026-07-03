const mongoose = require("mongoose");

let connectionPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!process.env.MONGO_URL) {
        console.warn("MONGO_URL is not set; skipping MongoDB connection.");
        return null;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(process.env.MONGO_URL)
        .then((connection) => {
            console.log("MongoDB Connected");
            return connection;
        })
        .catch((err) => {
            console.error("MongoDB connection failed:", err.message);
            connectionPromise = null;
            return null;
        });

    return connectionPromise;
};

module.exports = connectDB;