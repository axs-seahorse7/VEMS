import { 
    getVehicleTripLeaderboard, getFleetOverview, getFleetSummary, getAvgTripsPerDay,getTopPerformers, getTimeAnalysis, getTransporterVisits, 
    // getVehicleDashboard,
    tripFinder, 
    getTopVehicleId, 
    driverSearch, 
    vehicleSearch, 
    getTransporterCustomerTrend, 
    getVehiclePerformanceTable,
    getExecutiveDashboardSummary, 
    getFactoryVehicleDetails, 
    getVehicleSummary,
    getVehicleUsage,
    getVehicleTripTypeSplit,
    getTopVehiclesAndTransporters,
    getVehicleWaitingAnalysis,
    getVehicleDriverAnalytics,
    getVehiclePgToPg,
    downloadExecutiveDashboardExcel
} from "../controllers/analyticscontroller.js";
import express from "express";

const router = express.Router();

router.get("/vehicle-trip-leaderboard",     getVehicleTripLeaderboard);
router.get("/fleet-summary",                getFleetSummary);
router.get("/fleet-overview",               getFleetOverview);
router.get("/avg-trips-per-day",            getAvgTripsPerDay);
router.get("/top-performers",               getTopPerformers);
router.get("/time-analysis",                getTimeAnalysis);
router.get("/transporter-visits",           getTransporterVisits);
router.get("/transporter-customer-trend",   getTransporterCustomerTrend);
router.get("/vehicle-performance-table",    getVehiclePerformanceTable);
router.get("/vehicle-trip-leaderboard",     getVehicleTripLeaderboard);
router.get("/vehicle-dashboard/top",        getTopVehicleId);
// router.get("/vehicle-dashboard",            getVehicleDashboard);
router.get("/trip-finder/:tripId",          tripFinder);
router.get("/driver-search",                driverSearch);
router.get("/vehicle-search",               vehicleSearch);
router.get("/executive-dashboard/download", downloadExecutiveDashboardExcel);
router.get("/executive-dashboard/:factoryId/:metricKey", getFactoryVehicleDetails);
router.get("/executive-dashboard/:location",          getExecutiveDashboardSummary);



// New endpoints for Dashboard overview section

router.get("/vehicle-dashboard/summary", getVehicleSummary);
router.get("/vehicle-dashboard/usage", getVehicleUsage);
router.get("/vehicle-dashboard/trip-type-split", getVehicleTripTypeSplit);
router.get("/vehicle-dashboard/top-vehicles", getTopVehiclesAndTransporters);
router.get("/vehicle-dashboard/waiting", getVehicleWaitingAnalysis);
router.get("/vehicle-dashboard/drivers", getVehicleDriverAnalytics);
router.get("/vehicle-dashboard/pg-to-pg", getVehiclePgToPg);

export default router;