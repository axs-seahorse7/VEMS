import e from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import serverless from "serverless-http";

import connectDB from "../db/config/db.config.js";

// Routes
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import indexRoutes from "../routes/index.routes.js";
import vehicleRoutes from "../routes/vehicle.routes.js";
import gateRoutes from "../routes/gate.routes.js";
import tripRoutes from "../routes/trip.routes.js";

const app = e();

// DB
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection failed:", err);
    return res.status(500).json({ message: "DB connection failed" });
  }
});


// CORS
const allowedOrigins = [
  "https://vems-client.vercel.app",
  "https://vems-client.vercel.app/"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options(cors(corsOptions)); // 🔥 IMPORTANT

app.use(cookieParser());
app.use(e.json());

// Routes
app.get("/", (req, res) => {
  res.send("API Running");
});

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", indexRoutes);
app.use("/api", vehicleRoutes);
app.use("/api", gateRoutes);
app.use("/api", tripRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message });
});

// Export
export default serverless(app);