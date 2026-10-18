import e from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import cookieParser from "cookie-parser";
import helmet from "helmet";

import { createAdmin } from "../seed/createAdmin.js";
import errorMiddleware from "../middleware/Asynct-handler/errorMiddleware.js";
import { isAuthenticated } from "../middleware/isAuth/isAuthenticated.js";
import { startDelayCron } from "../services/crone/delayAlertCron.js";

import connectDB from "../db/config/db.config.js";
await connectDB(); 
startDelayCron();

// createAdmin(); 

// Routes
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import indexRoutes from "../routes/index.routes.js";
import vehicleRoutes from "../routes/vehicle.routes.js";
import tripRoutes from "../routes/trip.routes.js";
import analyticsRoutes from "../routes/analytics.route.js";
import settingsRoutes from "../controllers/settings.controller.js";
import {versionCheckMiddleware} from "../middleware/Version-Checker/version.js";

const allowedOrigins = [
  "http://localhost:5173",
  "https://vems-client.vercel.app",
  "http://192.168.19.100:5173",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  exposedHeaders: ["x-latest-version", "x-force-update"],
};

const app = e();

app.set("trust proxy", 1); 
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(e.json());

app.use(helmet());


app.use((req, res, next) => {
  if(process.env.NODE_ENV === "development") {
    console.log("HIT:", req.method, req.url);
  }
  next();
});

app.get("/", (req, res) => {
  return res.send("Welcome to the Vehicle Management System API");
});

app.get("/api/health", (req, res) => {
  return res.json({ status: "ok" });
});


app.use("/api/auth", authRoutes);

app.use(isAuthenticated);
app.use("/api", versionCheckMiddleware);
app.use("/api", userRoutes);
app.use("/api", indexRoutes);
app.use("/api", vehicleRoutes);
app.use("/api", tripRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use(errorMiddleware);

app.listen(process.env.PORT, (function () {
  console.log(`Server is running on port ${process.env.PORT}`);
}));

