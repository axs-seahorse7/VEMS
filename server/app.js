import e from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
import cookieParser from "cookie-parser";

import { createAdmin } from "./seed/createAdmin.js";
// createAdmin(); // Create admin user on server start (if not exists)

import dbConfig from "./db/config/db.config.js";
dbConfig; // Initialize DB connection

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import indexRoutes from "./routes/index.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import gateRoutes from "./routes/gate.routes.js";
import tripRoutes from "./routes/trip.routes.js";

const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
};

const app = e();

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(e.json());
app.use("/api/auth", authRoutes)
app.use("/api", userRoutes)
app.use("/api", indexRoutes)
app.use("/api", vehicleRoutes)
app.use("/api", gateRoutes)
app.use("/api", tripRoutes)

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(process.env.PORT, (function () {
  console.log(`Server is running on port ${process.env.PORT}`);
}));

7