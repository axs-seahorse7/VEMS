// controllers/analyticsController.js

import Trip from "../db/models/Vehicle-Model/trip.model.js"; 
import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";


export const getVehicleTripLeaderboard = async (req, res) => {
  try {
    const { period = "today", limit = 10 } = req.query;

    // ── Date boundary ──────────────────────────────────────────────
    const now   = new Date();
    let   since = new Date();

    if (period === "today") {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (period === "week") {
      since = new Date(now);
      since.setDate(now.getDate() - 7);
      since.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      since = new Date(now);
      since.setDate(now.getDate() - 30);
      since.setHours(0, 0, 0, 0);
    } else {
      return res.status(400).json({ message: "period must be today | week | month" });
    }

    // ── Aggregation ────────────────────────────────────────────────
    const leaderboard = await Trip.aggregate([
      // Only CLOSED trips within the time window
      {
        $match: {
          tripState:   "CLOSED",
          completedAt: { $gte: since, $lte: now },
        },
      },
      // Count per vehicle
      {
        $group: {
          _id:           "$vehicleId",
          tripCount:     { $sum: 1 },
          lastCompleted: { $max: "$completedAt" },
        },
      },
      { $sort: { tripCount: -1 } },
      { $limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 10)) },
      // Join vehicle details
      {
        $lookup: {
          from:         "vehicles",
          localField:   "_id",
          foreignField: "_id",
          as:           "vehicle",
        },
      },
      { $unwind: { path: "$vehicle" } },
      // Join ownerFactory
      {
        $lookup: {
          from:         "factories",
          localField:   "vehicle.ownerFactoryId",
          foreignField: "_id",
          as:           "factory",
        },
      },
      {
        $project: {
          _id:            0,
          vehicleId:      "$_id",
          tripCount:      1,
          lastCompleted:  1,
          vehicleNumber:  "$vehicle.vehicleNumber",
          typeOfVehicle:  "$vehicle.typeOfVehicle",
          ownershipType:  "$vehicle.type",
          isActive:       "$vehicle.isActive",
          factoryName:    { $arrayElemAt: ["$factory.name", 0] },
        },
      },
    ]);

    return res.status(200).json({
      period,
      since,
      leaderboard,
    });
  } catch (err) {
    console.error("Error fetching vehicle trip leaderboard:", err);
    return res.status(500).json({ message: "Failed to fetch leaderboard", error: err.message });
  }
};




// ── helpers ───────────────────────────────────────────────────────────────────
const parseDates = (query) => {
  const now = new Date();
  const start = query.startDate ? new Date(query.startDate) : (() => {
    const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d;
  })();
  const end = query.endDate ? new Date(query.endDate) : now;
  if (query.endDate) end.setHours(23,59,59,999);
  return { start, end };
};

const daysBetween = (a, b) => Math.max(1, Math.ceil((b - a) / 86400000));


// ── 1. Fleet Summary KPIs ─────────────────────────────────────────────────────
// GET /api/analytics/fleet-summary
export const getFleetSummary = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);

    const [activeVehicles, totalTrips, closedTrips] = await Promise.all([
      Vehicle.countDocuments({ isActive: true }),
      Trip.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Trip.countDocuments({ tripState: "CLOSED", completedAt: { $gte: start, $lte: end } }),
    ]);

    const days = daysBetween(start, end);
    const avgTripsPerDay = totalTrips / days;

    // Top performer (most closed trips)
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
      avgTripsPerDay: +avgTripsPerDay.toFixed(1),
      topPerformer: topVehicleAgg[0]?.vehicleNumber ?? "—",
      topPerformerTrips: topVehicleAgg[0]?.count ?? 0,
      periodDays: days,
    });
  } catch (err) {
    return res.status(500).json({ message: "Fleet summary failed", error: err.message });
  }
};


// ── 2. Fleet Overview ─────────────────────────────────────────────────────────
// GET /api/analytics/fleet-overview
export const getFleetOverview = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);
    const matchClosed = { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } };

    // PG vs Non-PG split (internal vs external vehicles)
    const ownershipSplit = await Trip.aggregate([
      { $match: matchClosed },
      { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "v" } },
      { $unwind: "$v" },
      { $group: { _id: "$v.type", count: { $sum: 1 }, vehicles: { $addToSet: "$vehicleId" } } },
    ]);

    // PG Vehicles Pareto
    const pgPareto = await Trip.aggregate([
      { $match: { ...matchClosed } },
      { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "v" } },
      { $unwind: "$v" },
      { $match: { "v.type": "internal" } },
      { $group: { _id: "$vehicleId", count: { $sum: 1 }, vehicleNumber: { $first: "$v.vehicleNumber" } } },
      { $sort: { count: -1 } },
    ]);

    // Non-PG Pareto
    const nonPgPareto = await Trip.aggregate([
      { $match: { ...matchClosed } },
      { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "v" } },
      { $unwind: "$v" },
      { $match: { "v.type": "external" } },
      { $group: { _id: "$vehicleId", count: { $sum: 1 }, vehicleNumber: { $first: "$v.vehicleNumber" } } },
      { $sort: { count: -1 } },
    ]);

    const addCumulative = (arr) => {
      const total = arr.reduce((s, r) => s + r.count, 0);
      let cum = 0;
      return arr.map(r => {
        cum += r.count;
        return { ...r, cumPct: +((cum / total) * 100).toFixed(1) };
      });
    };

    const pgCount  = ownershipSplit.find(o => o._id === "internal");
    const nonPgCount = ownershipSplit.find(o => o._id === "external");
    const pgTrips  = pgCount?.count  ?? 0;
    const nPgTrips = nonPgCount?.count ?? 0;
    const total    = pgTrips + nPgTrips;

    return res.json({
      pgVsNonPg: {
        pgTrips,  pgVehicles: pgCount?.vehicles?.length  ?? 0,
        nPgTrips, nPgVehicles: nonPgCount?.vehicles?.length ?? 0,
        pgPct: total ? +((pgTrips / total) * 100).toFixed(1) : 0,
        nPgPct: total ? +((nPgTrips / total) * 100).toFixed(1) : 0,
      },
      pgPareto:    addCumulative(pgPareto),
      nonPgPareto: addCumulative(nonPgPareto),
    });
  } catch (err) {
    return res.status(500).json({ message: "Fleet overview failed", error: err.message });
  }
};


// ── 3. Avg Trips Per Day ─────────────────────────────────────────────────────
// GET /api/analytics/avg-trips-per-day
export const getAvgTripsPerDay = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);
    const days = daysBetween(start, end);
    const matchClosed = { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } };

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

    const withAvg = (arr) => {
      const total = arr.reduce((s, r) => s + r.count, 0);
      let cum = 0;
      return arr.map(r => {
        const avg = +(r.count / days).toFixed(1);
        cum += r.count;
        return { ...r, avg, cumPct: +((cum / total) * 100).toFixed(1) };
      });
    };

    const p2p = typeBreakdown.find(t => t._id === "internal_transfer")?.count ?? 0;
    const delivery = typeBreakdown.find(t => t._id === "external_delivery")?.count ?? 0;
    const total = p2p + delivery;

    return res.json({
      pgAvgPareto:    withAvg(pgRaw),
      nonPgAvgPareto: withAvg(nonPgRaw),
      p2pVsDelivery: {
        p2p, delivery, total,
        p2pPct:      total ? +((p2p / total) * 100).toFixed(1) : 0,
        deliveryPct: total ? +((delivery / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Avg trips/day failed", error: err.message });
  }
};


// ── 4. Top Performers ─────────────────────────────────────────────────────────
// GET /api/analytics/top-performers
export const getTopPerformers = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);
    const matchClosed = { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } };

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
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
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
      // Idle = vehicles with 0 trips per day in range
      Trip.aggregate([
        { $match: { tripState: "CLOSED", completedAt: { $gte: start, $lte: end } } },
        { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } }, vehicle: "$vehicleId" } } },
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
      idlePerDay: dailyIdle.map(r => ({
        date: r._id,
        activeVehicles: r.activeVehicles,
        idleVehicles: Math.max(0, allVehicleCount - r.activeVehicles),
      })),
      busiestDays: busiestDays.map(r => ({ date: r._id, count: r.count })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Time analysis failed", error: err.message });
  }
};


// ── 6. Transporter / Supplier Customer Visits ─────────────────────────────────
// GET /api/analytics/transporter-visits
export const getTransporterVisits = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);

    const result = await Trip.aggregate([
      {
        $match: {
          tripState: "CLOSED",
          completedAt: { $gte: start, $lte: end },
          "materials.supplier": { $exists: true, $ne: "" },
        },
      },
      { $unwind: "$materials" },
      { $match: { "materials.supplier": { $exists: true, $ne: null, $ne: "" } } },
      {
        $group: {
          _id: { supplier: "$materials.supplier", customer: "$materials.customer" },
          visits: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.supplier",
          totalVisits: { $sum: "$visits" },
          customers: {
            $push: { customer: "$_id.customer", visits: "$visits" },
          },
          customerCount: { $sum: 1 },
        },
      },
      { $sort: { totalVisits: -1 } },
    ]);

    return res.json({ transporters: result.map(r => ({
      name:          r._id,
      totalVisits:   r.totalVisits,
      customerCount: r.customerCount,
      breakdown:     r.customers.sort((a, b) => b.visits - a.visits),
    })) });
  } catch (err) {
    return res.status(500).json({ message: "Transporter visits failed", error: err.message });
  }
};