// controllers/analyticsController.js

import Trip from "../db/models/Vehicle-Model/trip.model.js";
import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Max individual vehicles shown in any Pareto / ranked chart.
// Everything beyond this is bucketed into "Others".
const PARETO_TOP_N = 15;


// ── helpers ───────────────────────────────────────────────────────────────────
const parseDates = (query) => {
  const now = new Date();
  const start = query.startDate
    ? new Date(query.startDate)
    : (() => { const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; })();
  const end = query.endDate ? new Date(query.endDate) : now;
  if (query.endDate) end.setHours(23, 59, 59, 999);
  return { start, end };
};

const daysBetween = (a, b) => Math.max(1, Math.ceil((b - a) / 86400000));

/**
 * Takes a sorted-descending array of { label, count } items.
 * Keeps the top PARETO_TOP_N items individually;
 * collapses the rest into a single "Others" bucket.
 * Appends cumulative-% for the Pareto line.
 */
const buildPareto = (arr, labelKey = "vehicleNumber") => {
  const total = arr.reduce((s, r) => s + r.count, 0);
  const top   = arr.slice(0, PARETO_TOP_N);
  const rest  = arr.slice(PARETO_TOP_N);

  const items = top.map(r => ({ label: r[labelKey] ?? r.label ?? "Unknown", count: r.count }));

  if (rest.length > 0) {
    const othersCount = rest.reduce((s, r) => s + r.count, 0);
    items.push({ label: `Others (${rest.length} vehicles)`, count: othersCount, isOthers: true });
  }

  let cum = 0;
  return items.map(r => {
    cum += r.count;
    return { ...r, cumPct: total ? +((cum / total) * 100).toFixed(1) : 0 };
  });
};

/**
 * Factory-level rollup — groups trips by ownerFactoryId so large fleets
 * are summarised at the factory/depot level instead of per-vehicle.
 */
const buildFactoryRollup = async (matchClosed) => {
  return Trip.aggregate([
    { $match: matchClosed },
    {
      $lookup: {
        from: "vehicles", localField: "vehicleId",
        foreignField: "_id", as: "v",
      },
    },
    { $unwind: "$v" },
    {
      $group: {
        _id:          "$v.ownerFactoryId",
        count:        { $sum: 1 },
        vehicleCount: { $addToSet: "$vehicleId" },
      },
    },
    {
      $lookup: {
        from: "factories", localField: "_id",
        foreignField: "_id", as: "f",
      },
    },
    {
      $project: {
        factoryId:    "$_id",
        factoryName:  { $ifNull: [{ $arrayElemAt: ["$f.name", 0] }, "Unknown Factory"] },
        count:        1,
        vehicleCount: { $size: "$vehicleCount" },
      },
    },
    { $sort: { count: -1 } },
  ]);
};


// ── Leaderboard ───────────────────────────────────────────────────────────────
// GET /api/analytics/vehicle-trip-leaderboard
// Unchanged data structure — just capped to top-N with an "Others" row appended.
export const getVehicleTripLeaderboard = async (req, res) => {
  try {
    const { period = "today", limit = 10 } = req.query;

    const now   = new Date();
    let   since = new Date();

    if (period === "today") {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (period === "week") {
      since = new Date(now); since.setDate(now.getDate() - 7); since.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      since = new Date(now); since.setDate(now.getDate() - 30); since.setHours(0, 0, 0, 0);
    } else {
      return res.status(400).json({ message: "period must be today | week | month" });
    }

    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const leaderboard = await Trip.aggregate([
      { $match: { tripState: "CLOSED", completedAt: { $gte: since, $lte: now } } },
      { $group: { _id: "$vehicleId", tripCount: { $sum: 1 }, lastCompleted: { $max: "$completedAt" } } },
      { $sort: { tripCount: -1 } },
      { $limit: safeLimit },                          // ← hard cap; no "Others" here as it's a leaderboard
      { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "vehicle" } },
      { $unwind: { path: "$vehicle" } },
      { $lookup: { from: "factories", localField: "vehicle.ownerFactoryId", foreignField: "_id", as: "factory" } },
      {
        $project: {
          _id: 0, vehicleId: "$_id", tripCount: 1, lastCompleted: 1,
          vehicleNumber: "$vehicle.vehicleNumber",
          typeOfVehicle: "$vehicle.typeOfVehicle",
          ownershipType: "$vehicle.type",
          isActive:      "$vehicle.isActive",
          factoryName:   { $arrayElemAt: ["$factory.name", 0] },
        },
      },
    ]);

    return res.status(200).json({ period, since, leaderboard });
  } catch (err) {
    console.error("Error fetching vehicle trip leaderboard:", err);
    return res.status(500).json({ message: "Failed to fetch leaderboard", error: err.message });
  }
};


// ── 1. Fleet Summary KPIs ─────────────────────────────────────────────────────
// GET /api/analytics/fleet-summary
// Data structure: UNCHANGED
export const getFleetSummary = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);

    const [activeVehicles, totalTrips, closedTrips] = await Promise.all([
      Vehicle.countDocuments({ isActive: true }),
      Trip.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Trip.countDocuments({ tripState: "CLOSED", completedAt: { $gte: start, $lte: end } }),
    ]);

    const days            = daysBetween(start, end);
    const avgTripsPerDay  = totalTrips / days;

    // Top performer still a single vehicle — makes sense for KPI card
    const topVehicleAgg = await Trip.aggregate([
      { $match: { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$vehicleId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
      { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "v" } },
      { $project: { vehicleNumber: { $arrayElemAt: ["$v.vehicleNumber", 0] }, count: 1 } },
    ]);

    return res.json({
      activeVehicles,
      totalTrips,
      closedTrips,
      avgTripsPerDay:    +avgTripsPerDay.toFixed(1),
      topPerformer:      topVehicleAgg[0]?.vehicleNumber ?? "—",
      topPerformerTrips: topVehicleAgg[0]?.count ?? 0,
      periodDays:        days,
    });
  } catch (err) {
    return res.status(500).json({ message: "Fleet summary failed", error: err.message });
  }
};


// ── 2. Fleet Overview ─────────────────────────────────────────────────────────
// GET /api/analytics/fleet-overview
//
// CHANGES vs original:
//   • pgPareto / nonPgPareto → top PARETO_TOP_N vehicles + "Others" bucket
//   • NEW field `factoryRollup` — factory-level bar chart data
//     (UI can choose which to render; old fields kept so existing UI won't break)
export const getFleetOverview = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);
    const matchClosed    = { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } };

    // PG vs Non-PG split
    const ownershipSplit = await Trip.aggregate([
      { $match: matchClosed },
      { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "v" } },
      { $unwind: "$v" },
      {
        $group: {
          _id:      "$v.type",
          count:    { $sum: 1 },
          vehicles: { $addToSet: "$vehicleId" },
        },
      },
    ]);

    // Raw per-vehicle counts for PG and Non-PG (sorted desc)
    const [pgRaw, nonPgRaw, factoryRollupRaw] = await Promise.all([
      Trip.aggregate([
        { $match: matchClosed },
        { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "v" } },
        { $unwind: "$v" },
        { $match: { "v.type": "internal" } },
        { $group: { _id: "$vehicleId", count: { $sum: 1 }, vehicleNumber: { $first: "$v.vehicleNumber" } } },
        { $sort: { count: -1 } },
      ]),
      Trip.aggregate([
        { $match: matchClosed },
        { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "v" } },
        { $unwind: "$v" },
        { $match: { "v.type": "external" } },
        { $group: { _id: "$vehicleId", count: { $sum: 1 }, vehicleNumber: { $first: "$v.vehicleNumber" } } },
        { $sort: { count: -1 } },
      ]),
      buildFactoryRollup(matchClosed),
    ]);

    const pgCount    = ownershipSplit.find(o => o._id === "internal");
    const nonPgCount = ownershipSplit.find(o => o._id === "external");
    const pgTrips    = pgCount?.count  ?? 0;
    const nPgTrips   = nonPgCount?.count ?? 0;
    const total      = pgTrips + nPgTrips;

    return res.json({
      pgVsNonPg: {
        pgTrips,   pgVehicles:  pgCount?.vehicles?.length  ?? 0,
        nPgTrips,  nPgVehicles: nonPgCount?.vehicles?.length ?? 0,
        pgPct:  total ? +((pgTrips  / total) * 100).toFixed(1) : 0,
        nPgPct: total ? +((nPgTrips / total) * 100).toFixed(1) : 0,
      },
      // ── Pareto: top-N individual vehicles + Others bucket ──────────────
      pgPareto:    buildPareto(pgRaw),
      nonPgPareto: buildPareto(nonPgRaw),

      // ── NEW: factory-level rollup for large-fleet overview charts ──────
      // Shape: [{ factoryId, factoryName, count, vehicleCount }]
      factoryRollup: factoryRollupRaw.map(r => ({
        factoryId:    r.factoryId,
        factoryName:  r.factoryName,
        count:        r.count,
        vehicleCount: r.vehicleCount,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Fleet overview failed", error: err.message });
  }
};


// ── 3. Avg Trips Per Day ──────────────────────────────────────────────────────
// GET /api/analytics/avg-trips-per-day
//
// CHANGES vs original:
//   • pgAvgPareto / nonPgAvgPareto → top-N + "Others"
//   • p2pVsDelivery structure: UNCHANGED
export const getAvgTripsPerDay = async (req, res) => {
  try {
    const { start, end }  = parseDates(req.query);
    const days            = daysBetween(start, end);
    const matchClosed     = { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } };

    const [pgRaw, nonPgRaw, typeBreakdown] = await Promise.all([
      Trip.aggregate([
        { $match: matchClosed },
        { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "v" } },
        { $unwind: "$v" },
        { $match: { "v.type": "internal" } },
        { $group: { _id: "$vehicleId", count: { $sum: 1 }, vehicleNumber: { $first: "$v.vehicleNumber" } } },
        { $sort: { count: -1 } },
      ]),
      Trip.aggregate([
        { $match: matchClosed },
        { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "v" } },
        { $unwind: "$v" },
        { $match: { "v.type": "external" } },
        { $group: { _id: "$vehicleId", count: { $sum: 1 }, vehicleNumber: { $first: "$v.vehicleNumber" } } },
        { $sort: { count: -1 } },
      ]),
      Trip.aggregate([
        { $match: matchClosed },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
    ]);

    // Adds avg/day and cumPct, then collapses tail into Others
    const withAvg = (arr) => {
      const total = arr.reduce((s, r) => s + r.count, 0);
      const top   = arr.slice(0, PARETO_TOP_N);
      const rest  = arr.slice(PARETO_TOP_N);

      const items = top.map(r => ({
        label:         r.vehicleNumber ?? "Unknown",
        vehicleNumber: r.vehicleNumber ?? "Unknown",
        count:         r.count,
        avg:           +(r.count / days).toFixed(1),
      }));

      if (rest.length > 0) {
        const othersCount = rest.reduce((s, r) => s + r.count, 0);
        items.push({
          label:         `Others (${rest.length} vehicles)`,
          vehicleNumber: `Others (${rest.length} vehicles)`,
          count:         othersCount,
          avg:           +(othersCount / days).toFixed(1),
          isOthers:      true,
        });
      }

      let cum = 0;
      return items.map(r => {
        cum += r.count;
        return { ...r, cumPct: total ? +((cum / total) * 100).toFixed(1) : 0 };
      });
    };

    const p2p      = typeBreakdown.find(t => t._id === "internal_transfer")?.count ?? 0;
    const delivery = typeBreakdown.find(t => t._id === "external_delivery")?.count ?? 0;
    const total    = p2p + delivery;

    return res.json({
      pgAvgPareto:    withAvg(pgRaw),
      nonPgAvgPareto: withAvg(nonPgRaw),
      p2pVsDelivery: {
        p2p, delivery, total,
        p2pPct:      total ? +((p2p      / total) * 100).toFixed(1) : 0,
        deliveryPct: total ? +((delivery / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Avg trips/day failed", error: err.message });
  }
};


// ── 4. Top Performers ─────────────────────────────────────────────────────────
// GET /api/analytics/top-performers
// Data structure: UNCHANGED — already limited to top 5; dailyTrend unchanged.
export const getTopPerformers = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);
    const matchClosed    = { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } };

    const [top5P2P, top5Delivery, dailyTrend] = await Promise.all([
      Trip.aggregate([
        { $match: { ...matchClosed, type: "internal_transfer" } },
        { $group: { _id: "$vehicleId", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 5 },
        { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "v" } },
        { $project: { count: 1, vehicleNumber: { $arrayElemAt: ["$v.vehicleNumber", 0] } } },
      ]),
      Trip.aggregate([
        { $match: { ...matchClosed, type: "external_delivery" } },
        { $group: { _id: "$vehicleId", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 5 },
        { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "v" } },
        { $project: { count: 1, vehicleNumber: { $arrayElemAt: ["$v.vehicleNumber", 0] } } },
      ]),
      Trip.aggregate([
        { $match: matchClosed },
        {
          $group: {
            _id:   { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.json({
      top5P2P:      top5P2P.map(r => ({ vehicleNumber: r.vehicleNumber, count: r.count })),
      top5Delivery: top5Delivery.map(r => ({ vehicleNumber: r.vehicleNumber, count: r.count })),
      dailyTrend:   dailyTrend.map(r => ({ date: r._id, count: r.count })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Top performers failed", error: err.message });
  }
};


// ── 5. Time-Based Analysis ────────────────────────────────────────────────────
// GET /api/analytics/time-analysis
// Data structure: UNCHANGED
export const getTimeAnalysis = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);

    const [monthlyTrends, dailyIdle, busiestDays, allVehicleCount] = await Promise.all([
      Trip.aggregate([
        { $match: { tripState: "CLOSED" } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$completedAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 12 },
      ]),
      Trip.aggregate([
        { $match: { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: {
              date:    { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
              vehicle: "$vehicleId",
            },
          },
        },
        { $group: { _id: "$_id.date", activeVehicles: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Trip.aggregate([
        { $match: { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
      Vehicle.countDocuments({ isActive: true }),
    ]);

    return res.json({
      monthlyTrends: monthlyTrends.map(r => ({ month: r._id, count: r.count })),
      idlePerDay:    dailyIdle.map(r => ({
        date:           r._id,
        activeVehicles: r.activeVehicles,
        idleVehicles:   Math.max(0, allVehicleCount - r.activeVehicles),
      })),
      busiestDays: busiestDays.map(r => ({ date: r._id, count: r.count })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Time analysis failed", error: err.message });
  }
};


// ── 6. Transporter / Supplier Customer Visits ─────────────────────────────────
// GET /api/analytics/transporter-visits
// Data structure: UNCHANGED
export const getTransporterVisits = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);

    const result = await Trip.aggregate([
      {
        $match: {
          tripState:           "CLOSED",
          completedAt:         { $gte: start, $lte: end },
          "materials.supplier": { $exists: true, $ne: "" },
        },
      },
      { $unwind: "$materials" },
      { $match: { "materials.supplier": { $exists: true, $ne: null, $ne: "" } } },
      {
        $group: {
          _id:    { supplier: "$materials.supplier", customer: "$materials.customer" },
          visits: { $sum: 1 },
        },
      },
      {
        $group: {
          _id:           "$_id.supplier",
          totalVisits:   { $sum: "$visits" },
          customers:     { $push: { customer: "$_id.customer", visits: "$visits" } },
          customerCount: { $sum: 1 },
        },
      },
      { $sort: { totalVisits: -1 } },
    ]);

    return res.json({
      transporters: result.map(r => ({
        name:          r._id,
        totalVisits:   r.totalVisits,
        customerCount: r.customerCount,
        breakdown:     r.customers.sort((a, b) => b.visits - a.visits),
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Transporter visits failed", error: err.message });
  }
};









const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
 
const periodBounds = (period = "week") => {
  const now  = new Date();
  let   since = new Date();
  if (period === "today") {
    since = startOfDay(now);
  } else if (period === "week") {
    since = new Date(now); since.setDate(now.getDate() - 7);  since.setHours(0,0,0,0);
  } else if (period === "month") {
    since = new Date(now); since.setDate(now.getDate() - 30); since.setHours(0,0,0,0);
  } else if (period === "quarter") {
    since = new Date(now); since.setDate(now.getDate() - 90); since.setHours(0,0,0,0);
  } else {
    since = new Date(now); since.setDate(now.getDate() - 7);  since.setHours(0,0,0,0);
  }
  return { since, now };
};
 
 
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/vehicle-dashboard?vehicleId=<id>&period=week
//
// Response shape (mirrors the screenshot sections):
// {
//   vehicle         – static vehicle info
//   weeklyStats     – left-panel metrics
//   stateOfHealth   – donut: closed/open/cancelled trip health
//   driverBehavior  – bar: on-time start, smooth runs, idle ratio
//   vehicleUsage    – area sparkline: trips per day for the period
//   idleAnalysis    – horizontal bars: active vs idle days
//   tripTypeSplit   – 3 donuts: internal / external / mixed
//   availability    – Good / Medium / HighPriority trip-completion tiers
// }
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleDashboard = async (req, res) => {
  try {
    const { vehicleId, period = "week" } = req.query;
    if (!vehicleId) return res.status(400).json({ message: "vehicleId is required" });
 
    const { since, now } = periodBounds(period);
    const mongoose       = (await import("mongoose")).default;
    const vid            = new mongoose.Types.ObjectId(vehicleId);
 
    // ── 1. Vehicle info ───────────────────────────────────────────────────
    const vehicle = await Vehicle.findById(vid).lean();
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
 
    // ── 2. Trips in period ────────────────────────────────────────────────
    const [periodTrips, allClosedTrips, firstTrip] = await Promise.all([
      Trip.find({ vehicleId: vid, createdAt: { $gte: since, $lte: now } }).lean(),
      Trip.countDocuments({ vehicleId: vid, tripState: "CLOSED" }),
      Trip.findOne({ vehicleId: vid }).sort({ createdAt: 1 }).lean(),
    ]);

    const closed    = periodTrips.filter(t => t.tripState === "CLOSED");
    const open      = periodTrips.filter(t => t.tripState === "ACTIVE" || t.tripState === "COMPLETED");
    const cancelled = periodTrips.filter(t => t.tripState === "CANCELLED");
    const total     = periodTrips.length;

    const [totalTrips, totalClosedTrips, totalActiveTrips, totalCanceledTrips, totalInternalTrips, totalExternalTrips] = await Promise.all([
      Trip.find({ createdAt: { $gte: since, $lte: now } }).countDocuments(),
      Trip.countDocuments({tripState: "CLOSED", createdAt: { $gte: since, $lte: now } }),
      Trip.countDocuments({tripState: {$in: ["ACTIVE", "COMPLETED"]}, createdAt: { $gte: since, $lte: now } }),
      Trip.countDocuments({tripState: "CANCELLED", createdAt: { $gte: since, $lte: now } }),
      Trip.countDocuments({type: "internal_transfer", createdAt: { $gte: since, $lte: now } }),
      Trip.countDocuments({type: "external_delivery", createdAt: { $gte: since, $lte: now } }),
    ]);


 
    // ── 3. weeklyStats ────────────────────────────────────────────────────
    const daysSinceFirst = firstTrip
      ? Math.max(1, Math.ceil((now - new Date(firstTrip.createdAt)) / 86400000))
      : 1;
    const monthsActive = +(daysSinceFirst / 30).toFixed(1);
    const years        = Math.floor(monthsActive / 12);
    const months       = Math.round(monthsActive % 12);
    const activeSince  = years > 0
      ? `${years} Year${years > 1 ? "s" : ""} & ${months} Month${months !== 1 ? "s" : ""}`
      : `${months} Month${months !== 1 ? "s" : ""}`;
 
    // ── 4. State of Health (donut) ────────────────────────────────────────
    const closedPct    = total ? +((totalClosedTrips   / totalTrips) * 100).toFixed(1) : 0;
    const openPct      = total ? +((totalActiveTrips      / totalTrips) * 100).toFixed(1) : 0;
    const cancelledPct = total ? +((totalCanceledTrips / totalTrips) * 100).toFixed(1) : 0;
    // SOH = % of trips that closed successfully
    const sohPct = closedPct;
 
    // ── 5. Driver Behavior proxy ──────────────────────────────────────────
    // On-time start: closed trips / total expected  (proxy for punctuality)
    // Harsh runs: cancelled + open  (proxy for disruptions)
    // Idle trips: open and not started on time (proxy)
    const onTimePct    = totalTrips ? Math.round((totalClosedTrips / totalTrips) * 100) : 0;
    const harshRunsPct = totalTrips ? Math.round(((totalCanceledTrips) / totalTrips) * 100) : 0;
    const idlePct      = totalTrips ? Math.round((totalActiveTrips / totalTrips) * 100) : 0;
 
    // ── 6. Vehicle usage — trips per day sparkline ────────────────────────
    const dailyMap = {};

    

    closed.forEach(t => {
      const key = new Date(t.completedAt).toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });

    const days     = Math.max(1, Math.ceil((now - since) / 86400000));
    const dailyArr = [];
    for (let i = 0; i < days; i++) {
      const d   = new Date(since); d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyArr.push({ date: key, count: dailyMap[key] ?? 0 });
    }

    const getTripHours = (trip) => {
      if (trip.startedAt && trip.completedAt) {
        const start = new Date(trip.startedAt);
        const end = new Date(trip.completedAt);

        const diffMs = end - start;

        return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      return 0;
    };

    const totalTripHours = +closed.reduce((sum, trip) => sum + getTripHours(trip), 0).toFixed(2);
    const avgTripsPerDay    = +(closed.length / days).toFixed(1);

    
    const [factoryClosedTrips, factoryCancelledTrips] = await Promise.all([
      Trip.aggregate([
        {
          $match: {
            tripState: "CLOSED",
            // type: "internal_transfer",
            completedAt: { $gte: since, $lte: now },
            destinationFactoryId: { $ne: null },
          },
        },
        {
          $lookup: {
            from:         "factories",
            localField:   "destinationFactoryId",
            foreignField: "_id",
            as:           "f",
          },
        },
        {
          $group: {
            _id:         "$destinationFactoryId",
            factoryName: { $first: { $ifNull: [{ $arrayElemAt: ["$f.name", 0] }, "Unknown"] } },
            count:       { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      Trip.aggregate([
        {
          $match: {
            tripState: "CANCELLED",
            // type: "internal_transfer",
            createdAt: { $gte: since, $lte: now },
            destinationFactoryId: { $ne: null },
          },
        },
        {
          $lookup: {
            from:         "factories",
            localField:   "destinationFactoryId",
            foreignField: "_id",
            as:           "f",
          },
        },
        {
          $group: {
            _id:         "$destinationFactoryId",
            factoryName: { $first: { $ifNull: [{ $arrayElemAt: ["$f.name", 0] }, "Unknown"] } },
            count:       { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Merge into dailyArr so every date slot exists (fills zero-days too)
    const factoryFlowMap = {};

    const factoryDailyArr = dailyArr.map(day => ({
      date:       day.date,
      count:      factoryFlowMap[day.date]?.totalOnDay ?? 0,
      factories:  factoryFlowMap[day.date]?.factories  ?? [],
    }));
 
    // ── 7. Idle analysis (FC Idle Time equivalent) ────────────────────────
    const activeDays = Object.keys(dailyMap).length;
    const idleDays   = Math.max(0, days - activeDays);
    const idleDayPct = +((idleDays / days) * 100).toFixed(1);
 
    // ── 8. Trip-type split (3 donuts — internal / external / both) ────────
    const internalTrips = closed.filter(t => t.type === "internal_transfer").length;
    const externalTrips = closed.filter(t => t.type === "external_delivery").length;
    const otherTrips    = closed.length - internalTrips - externalTrips;
 
    // ── 9. Availability tiers ─────────────────────────────────────────────
    // Good   = days where vehicle ran ≥ 3 trips
    // Medium = days where vehicle ran 1–2 trips
    // Low    = idle days
    let goodDays = 0, mediumDays = 0, lowDays = 0;

    for (let i = 0; i < days; i++) {
      const d   = new Date(since); 
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const cnt = dailyMap[key] ?? 0;
      if (cnt >= 3) goodDays++;
      else if (cnt >= 1) mediumDays++;
      else lowDays++;
    }


    const goodPct   = +((goodDays   / days) * 100).toFixed(1);
    const medPct    = +((mediumDays / days) * 100).toFixed(1);
    const lowPriPct = +((lowDays    / days) * 100).toFixed(1);
 
    return res.json({
      period,
      since,
      now,
 
      vehicle: {
        id:            vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        typeOfVehicle: vehicle.typeOfVehicle,
        type:          vehicle.type,           // internal | external
        isActive:      vehicle.isActive,
        model:         vehicle.model ?? vehicle.vehicleNumber,
      },
 
      weeklyStats: {
        activeSince,
        totalClosedTrips: allClosedTrips,
        periodTrips:      total,
        periodClosed:     closed.length,
        avgTripsPerDay,
        totalTripHours,
      },
 
      stateOfHealth: {
        sohPct,          // big number shown in donut centre
        segments: [
          { label: "Completed", value: totalClosedTrips,    pct: closedPct,    color: "#0d9488" },
          { label: "Active",    value: totalActiveTrips,    pct: openPct,      color: "#94a3b8" },
          { label: "Cancelled", value: totalCanceledTrips,  pct: cancelledPct, color: "#fca5a5" },
        ],
        totalIssues: totalCanceledTrips,   // "issues detected" headline
      },
 
      driverBehavior: {
        onTimePct,
        harshRunsPct,
        idlePct,
        bars: [
          { label: "On-time Starts",  value: onTimePct,    color: "#0d9488" },
          { label: "Disrupted Runs",  value: harshRunsPct, color: "#EA5252" },
          { label: "Idle / Waiting",  value: idlePct,      color: "#cbd5e1" },
        ],
      },
 
      vehicleUsage: {
        totalHours:     totalTripHours,
        avgTripsPerDay,
        dailyTrend:     dailyArr,   // [{date, count}] — UI draws area chart
      },

      vehicleUsage: {
        totalHours:     totalTripHours,
        avgTripsPerDay,
        dailyTrend:     dailyArr,
        factoryChart: {
          closed:    factoryClosedTrips.map(r => ({ factoryName: r.factoryName, count: r.count })),
          cancelled: factoryCancelledTrips.map(r => ({ factoryName: r.factoryName, count: r.count })),
        },
      },
 
      idleAnalysis: {
        idleDayPct,
        activeDays,
        idleDays,
        bars: [
          { label: "Active Days", value: activeDays, max: days, color: "#0d9488" },
          { label: "Idle Days",   value: idleDays,   max: days, color: "#e2e8f0" },
        ],
      },
 
      tripTypeSplit: {
        donuts: [
          {
            label: "Internal",
            value: totalInternalTrips,
            pct:   totalClosedTrips ? +((totalInternalTrips / totalClosedTrips) * 100).toFixed(1) : 0,
            color: "#0d9488",
          },
          {
            label: "External",
            value: totalExternalTrips,
            pct:   totalClosedTrips ? +((totalExternalTrips / totalClosedTrips) * 100).toFixed(1) : 0,
            color: "#FF9D23",
          },
          {
            label: "Other",
            value: otherTrips,
            pct:   totalClosedTrips ? +((otherTrips / totalClosedTrips) * 100).toFixed(1) : 0,
            color: "#cbd5e1",
          },
        ],
      },
 
      availability: {
        overallPct: goodPct,
        tiers: [
          { label: "Good",         range: "≥ 3 trips/day",  pct: goodPct,   color: "#0d9488", days: goodDays   },
          { label: "Medium",       range: "1–2 trips/day",  pct: medPct,    color: "#94a3b8", days: mediumDays },
          { label: "High Priority",range: "0 trips/day",    pct: lowPriPct, color: "#fca5a5", days: lowDays    },
        ],
      },
    });
  } catch (err) {
    console.error("Vehicle dashboard error:", err);
    return res.status(500).json({ message: "Vehicle dashboard failed", error: err.message });
  }
};
  
 
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/vehicle-dashboard/top
// Returns the top vehicle (most closed trips in last 30 days) to auto-select
// on page load when no vehicleId is provided.
// ─────────────────────────────────────────────────────────────────────────────
export const getTopVehicleId = async (req, res) => {
  try {
    const since = new Date(); since.setDate(since.getDate() - 30); since.setHours(0,0,0,0);
    const [top] = await Trip.aggregate([
      { $match: { tripState: "CLOSED", completedAt: { $gte: since } } },
      { $group: { _id: "$vehicleId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    if (!top) return res.status(404).json({ message: "No trips found" });
    return res.json({ vehicleId: top._id });
  } catch (err) {
    return res.status(500).json({ message: "Could not fetch top vehicle", error: err.message });
  }
};