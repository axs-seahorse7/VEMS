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
await connectDB(); // Initialize DB connection

/* =========================  
   CORS (keep it simple)
========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "https://vems-client.vercel.app",
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.includes(".vercel.app")) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));


/* =========================
   Parsers
========================= */
app.use(cookieParser());
app.use(e.json());

/* =========================
   Health (NO DB)
========================= */
app.get("/api/health", (req, res) => {
  return res.status(200).json({ status: "ok" });
});



/* =========================
   Routes
========================= */
app.get("/", (req, res) => {
  return res.send("API Running");
});

app.use((req, res, next) => {
  console.log("HIT vercle :", req.method, req.url);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", indexRoutes);
app.use("/api", vehicleRoutes);
app.use("/api", gateRoutes);
app.use("/api", tripRoutes);

/* =========================
   Error Handler
========================= */
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  return res.status(500).json({ message: err.message || "Server error" });
});


export default serverless(app);