import mongoose from "mongoose";
// import dotenv from "dotenv";
// dotenv.config();

const dbConfig = {
  HOST: process.env.DB_HOST || "localhost",
  PORT: process.env.DB_PORT || 27017,
  DB: process.env.DB_NAME   || "vems_db",
  CLOUD_DB: process.env.DB_HOST_PROD,
};

// Decide URI
const isProd = process.env.SERVER_ENV === "production";
console.log("Environment:", process.env.SERVER_ENV);
console.log(`Connecting to ${isProd ? "Cloud" : "Local"} MongoDB... (${isProd ? dbConfig.CLOUD_DB : `${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`})`);
const MONGO_URI = isProd? dbConfig.CLOUD_DB : `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

// Connect
mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB connection error:", err));
const db = mongoose.connection;

// Error
db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Success
db.once("open", () => {
  if (isProd) {
    console.log("☁️ MongoDB Connected (Cloud Database)");
  } else {
    console.log("💻 MongoDB Connected (Local Database)");
  }
});

export default db;