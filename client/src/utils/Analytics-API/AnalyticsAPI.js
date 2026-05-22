// analytics/analyticsApi.js
// All API calls for the Vehicle Analytics dashboard
import api from "../../../services/API/Api/api"; // adjust path

// ── Date helpers ──────────────────────────────────────────────────────────────
export const buildDateFilter = (startDate, endDate) => ({
  ...(startDate ? { startDate } : {}),
  ...(endDate   ? { endDate }   : {}),
});

// ── 1. Summary KPIs ───────────────────────────────────────────────────────────
// GET /api/analytics/fleet-summary?startDate=&endDate=&shift=all|day|night
export const fetchFleetSummary = (params) =>
  api.get("/analytics/fleet-summary", { params }).then(r => r.data);

// ── 2. Fleet Overview ─────────────────────────────────────────────────────────
// GET /api/analytics/fleet-overview?startDate=&endDate=
// Returns: { pgVsNonPg, pgPareto, nonPgPareto }
export const fetchFleetOverview = (params) =>
  api.get("/analytics/fleet-overview", { params }).then(r => r.data);

// ── 3. Avg Trips Per Day ──────────────────────────────────────────────────────
// GET /api/analytics/avg-trips-per-day?startDate=&endDate=
// Returns: { pgAvgPareto, nonPgAvgPareto, p2pVsDelivery }
export const fetchAvgTripsPerDay = (params) =>
  api.get("/analytics/avg-trips-per-day", { params }).then(r => r.data);

// ── 4. Top Performers ─────────────────────────────────────────────────────────
// GET /api/analytics/top-performers?startDate=&endDate=
// Returns: { top5P2P, top5Delivery, dailyTrend }
export const fetchTopPerformers = (params) =>
  api.get("/analytics/top-performers", { params }).then(r => r.data);

// ── 5. Time-Based Analysis ────────────────────────────────────────────────────
// GET /api/analytics/time-analysis?startDate=&endDate=
// Returns: { monthlyTrends, idlePerDay, busiestDays }
export const fetchTimeAnalysis = (params) =>
  api.get("/analytics/time-analysis", { params }).then(r => r.data);

// ── 6. Supplier/Transporter Customer Visits ───────────────────────────────────
// GET /api/analytics/transporter-visits?startDate=&endDate=
// Returns: { transporters: [{name, customerCount, totalVisits, breakdown:[]}] }
export const fetchTransporterVisits = (params) =>
  api.get("/analytics/transporter-visits", { params }).then(r => r.data);

// ── Vehicle Trip Leaderboard (already built) ──────────────────────────────────
export const fetchTripLeaderboard = (params) =>
  api.get("/analytics/vehicle-trip-leaderboard", { params }).then(r => r.data);

