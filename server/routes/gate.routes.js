import express from "express";
import {externalEntry, getDashboardData, checkoutVehicle, checkinVehicle, getIncomingVehicles, getVehicleStatus } from "../controllers/gate.controllers.js";

const router = express.Router();

router.post("/gate/checkout", checkoutVehicle);
router.post("/gate/checkin", checkinVehicle);
router.post("/gate/external-entry", externalEntry);
router.get("/trip/incoming/:factoryId", getIncomingVehicles);
router.get("/vehicle/status/:vehicleNumber", getVehicleStatus);
router.get("/dashboard/:factoryId", getDashboardData);
export default router;