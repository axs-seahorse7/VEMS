import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const isProduction = process.env.SERVER_ENV === "production";
  console.log(`Connecting to MongoDB... (Production: ${isProduction})`);
  try {
    const MONGO_URI = isProduction 
      ? process.env.DB_HOST_PROD 
      : process.env.DB_LOCAL_URI;

    if (!MONGO_URI) {
      console.error("MONGO_URI not defined in environment variables");
      throw new Error("MONGO_URI not defined");
    }

    const conn = await mongoose.connect(MONGO_URI, {
      bufferCommands: false,
    });

    isConnected = conn.connections[0].readyState;
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Error:", error);
    throw error;
  }
};



export default connectDB;