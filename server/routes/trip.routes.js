import {externalVehicleRegister, getVehicleTrips, getActiveTrip, getTripHistory, getFactoryTrips, cancelTrip, getIncomingTrips, createTrip, unloadTrip } from "../controllers/trip.contollers.js";
import express from "express";
import {isAuthenticated} from "../middleware/isAuth/isAuthenticated.js";
import {internalVehicleRegister, checkinVehicle, checkoutVehicle, checkoutAndExitVehicle, markArrived, completeTrip, markInternalTransferComplete, markLoadCompleteAtDestination } from "../controllers/trip.contollers.js";
const router = express.Router();

router.use(isAuthenticated);

router.get("/trip/active/:vehicleNumber", getActiveTrip);
router.get("/trip/history/:vehicleNumber", getTripHistory);
router.get("/trip/factory/:factoryId", getFactoryTrips);
router.post("/trip/cancel/:tripId", cancelTrip);
router.get("/trip/incoming/:factoryId", getIncomingTrips);
router.post("/trip/create", createTrip);


//new routes to add:
router.post("/new/external-trip", externalVehicleRegister);
router.post("/new/internal-trip", internalVehicleRegister);
router.post("/trip/checkin/:tripId", checkinVehicle);
router.post("/trip/checkout/:tripId", checkoutVehicle);
router.post("/trip/exit-checkout/:tripId", checkoutAndExitVehicle);
router.post("/trip/arrive/:tripId", markArrived);
router.post("/trip/complete/:tripId", completeTrip);
router.post("/trip/internal-transfer-complete/:tripId", markInternalTransferComplete);
router.post("/trip/load-complete/:tripId", markLoadCompleteAtDestination);
router.post("/trip/unload/:tripId", unloadTrip);




router.get("/vehicle/trips", getVehicleTrips);

export default router;
