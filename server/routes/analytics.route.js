import {getVehicleTripLeaderboard, getFleetOverview, getFleetSummary, getAvgTripsPerDay,getTopPerformers, getTimeAnalysis, getTransporterVisits, getVehicleDashboard, getTopVehicleId} from "../controllers/analyticscontroller.js";
import express from "express";

const router = express.Router();

router.get("/vehicle-trip-leaderboard", getVehicleTripLeaderboard);
router.get("/fleet-summary",         getFleetSummary);
router.get("/fleet-overview",        getFleetOverview);
router.get("/avg-trips-per-day",     getAvgTripsPerDay);
router.get("/top-performers",        getTopPerformers);
router.get("/time-analysis",         getTimeAnalysis);
router.get("/transporter-visits",    getTransporterVisits);
router.get("/vehicle-trip-leaderboard", getVehicleTripLeaderboard);
router.get("/vehicle-dashboard/top", getTopVehicleId);
router.get("/vehicle-dashboard", getVehicleDashboard);



export default router;