import express from "express";
import {
  upsertEntry,
  updateEntry,
  deleteEntry,
  getEntries,
  getVanByVehicleNumber,
  getVanHistory,
  checkIn,
  loadingStart,
  loadingEnd,
  checkOut,
  markArrived,
} from "../controllers/index.controllers.js";
import { createFactory, getFactoryById, getFactories } from "../controllers/factory.contoller.js";
import { isAuthenticated } from "../middleware/isAuth/isAuthenticated.js";

const router = express.Router();

// ── Vehicle / Entry ────────────────────────────────────────────────────────────
router.get("/entries",                        isAuthenticated, getEntries);
router.get("/entry/:vehicleNumber",           isAuthenticated, getVanByVehicleNumber);  // lookup by plate
router.post("/entry/upsert",                  isAuthenticated, upsertEntry);             // create / re-register

// ── Workflow State Transitions ─────────────────────────────────────────────────
// waiting  → inside
router.post("/entry/:id/checkin",             isAuthenticated, checkIn);
// inside   → loading (dock)
router.post("/entry/:id/loading-start",       isAuthenticated, loadingStart);
// loading  → ready-to-checkout
router.post("/entry/:id/loading-end",         isAuthenticated, loadingEnd);
// inside   → enroute  (guard dispatches)
router.post("/entry/:id/checkout",            isAuthenticated, checkOut);
// enroute  → waiting  (van arrives at destination gate)
router.post("/entry/:id/arrived",             isAuthenticated, markArrived);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.put("/entry/:id",                      isAuthenticated, updateEntry);
router.delete("/entry/:id",                   isAuthenticated, deleteEntry);
router.get("/entry/:id/history",              isAuthenticated, getVanHistory);

// ── Factory ───────────────────────────────────────────────────────────────────
router.post("/factory",                       isAuthenticated, createFactory);
router.get("/factory/:id",                    isAuthenticated, getFactoryById);
router.get("/factories",                      isAuthenticated, getFactories);

export default router;