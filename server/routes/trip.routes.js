import {externalVehicleRegister, getVehicleTrips, getActiveTrip, getTripHistory, getFactoryTrips, cancelTrip, getIncomingTrips, createTrip, unloadTrip } from "../controllers/trip.contollers.js";
import express from "express";
import {isAuthenticated} from "../middleware/isAuth/isAuthenticated.js";
import {internalVehicleRegister, checkinVehicle, checkoutVehicle, markArrived, closeTrip, } from "../controllers/trip.contollers.js";
const router = express.Router();

router.use(isAuthenticated);

router.get("/trip/active/:vehicleNumber", getActiveTrip);
router.get("/trip/history/:vehicleNumber", getTripHistory);
router.get("/trip/factory/:factoryId", getFactoryTrips);
router.post("/trip/cancel/:tripId", cancelTrip);
router.get("/trip/incoming/:factoryId", getIncomingTrips);
router.post("/trip/create", createTrip);
router.post("/store/unload/:tripId", unloadTrip);


//new routes to add:
router.post("/new/external-trip", externalVehicleRegister);
router.post("/new/internal-trip", internalVehicleRegister);
router.get("/vehicle/trips", getVehicleTrips);
router.post("/trip/checkin/:tripId", checkinVehicle);
router.post("/trip/checkout/:tripId", checkoutVehicle);
router.post("/trip/arrive/:tripId", markArrived);
router.post("/trip/close/:tripId", closeTrip);
export default router;
