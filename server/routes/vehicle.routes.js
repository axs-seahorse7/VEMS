import express from "express";
import {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  toggleVehicleStatus,
  getVehicleByNumber,
  lookupDriver,
  getAvailableVehicles,
  // getAvailableVehicleById,
} from "../controllers/vehicles.contollers.js";

const router = express.Router();

router.get("/vehicles", getAllVehicles);

// ✅ specific routes FIRST
router.get("/vehicles/get-available", getAvailableVehicles);
router.get("/vehicles/number/:vehicleNumber", getVehicleByNumber);
router.get("/lookup", lookupDriver);

// ❗ dynamic routes AFTER
router.get("/vehicles/:id", getVehicleById);

router.post("/vehicles", createVehicle);
router.put("/vehicles/:id", updateVehicle);
router.delete("/vehicles/:id", deleteVehicle);
router.patch("/vehicles/:id/toggle-status", toggleVehicleStatus);

// router.get("/vehicles/available/:id", getAvailableVehicleById);

export default router;