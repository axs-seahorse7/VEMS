import e from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "../db/config/db.config.js";
await connectDB(); // Initialize DB connection

console.log("env.PORT:", process.env.SERVER_ENV, process.env.PORT);
// Routes
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import indexRoutes from "../routes/index.routes.js";
import vehicleRoutes from "../routes/vehicle.routes.js";
import gateRoutes from "../routes/gate.routes.js";
import tripRoutes from "../routes/trip.routes.js";

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

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(e.json());

app.get("/", (req, res) => {
 return res.send("Welcome to the Vehicle Management System API");
});

app.get("/api/health", (req, res) => {
 return res.json({ status: "ok" });
});

app.use((req, res, next) => {
  console.log("HIT:", req.method, req.url);
  next();
});

app.use("/api/auth", authRoutes)
app.use("/api", userRoutes)
app.use("/api", indexRoutes)
app.use("/api", vehicleRoutes)
app.use("/api", gateRoutes)
app.use("/api", tripRoutes)


app.listen(process.env.PORT, (function () {
  console.log(`Server is running on port ${process.env.PORT}`);
}));

