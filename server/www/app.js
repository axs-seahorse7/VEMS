import e from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();


import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { createAdmin } from "../seed/createAdmin.js";
import { globalLimiter } from "../services/expressRateLimiter.js";
import errorMiddleware from "../middleware/Asynct-handler/errorMiddleware.js";
import { isAuthenticated } from "../middleware/isAuth/isAuthenticated.js";

import connectDB from "../db/config/db.config.js";
await connectDB(); // Initialize DB connection

// createAdmin(); 

// Routes
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import indexRoutes from "../routes/index.routes.js";
import vehicleRoutes from "../routes/vehicle.routes.js";
import gateRoutes from "../routes/gate.routes.js";
import tripRoutes from "../routes/trip.routes.js";
import analyticsRoutes from "../routes/analytics.route.js";

const allowedOrigins = ['http://localhost:5173', 'https://vems-client.vercel.app'];

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

app.set("trust proxy", 1); 
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(e.json());

app.use(helmet());
app.use(globalLimiter);


app.use((req, res, next) => {
  console.log("HIT:", req.method, req.url);
  next();
});

app.use(helmet());
app.use(globalLimiter);


app.use((req, res, next) => {
  console.log("HIT:", req.method, req.url);
  next();
});

app.get("/", (req, res) => {
  return res.send("Welcome to the Vehicle Management System API");
});

app.get("/api/health", (req, res) => {
  return res.json({ status: "ok" });
});



// app.use((req, res, next) => {
  
  //   console.log({
    //     ip: req.ip,
    //     method: req.method,
//     url: req.url,
//     userAgent: req.headers["user-agent"],
//     xForwardedFor: req.headers["x-forwarded-for"]
//   });

//   next();
// });

app.use("/api/auth", authRoutes)


app.use(isAuthenticated)
app.use("/api", userRoutes)
app.use("/api", indexRoutes)
app.use("/api", vehicleRoutes)
app.use("/api", gateRoutes)
app.use("/api", tripRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use(errorMiddleware);

app.listen(process.env.PORT, (function () {
  console.log(`Server is running on port ${process.env.PORT}`);
}));

