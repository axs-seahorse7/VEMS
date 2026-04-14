import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const MONGO_URI = process.env.DB_HOST_PROD; // only use cloud

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