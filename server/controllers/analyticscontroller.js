// controllers/analyticsController.js
import mongoose from "mongoose";
import ExcelJS from "exceljs";

import Trip from "../db/models/Vehicle-Model/trip.model.js";
import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
import TripSegment from "../db/models/Vehicle-Model/tripSegment.model.js"; // not used directly below — Trip already carries current location/state; reach for this if you need per-leg segment history
import Driver from "../db/models/Driver-model/driver.model.js";
import Factory from "../db/models/factory-model/factory.model.js"; // adjust path if this lives elsewhere


import {  buildFactoryFilter, buildAllDates, getTripHours,  resolveDateRange} from "./utils/vehicleDashboardHelpers.js";
import asyncHandler from "../middleware/Asynct-handler/asyncHandler.js";


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
      { $match: { tripState: "CLOSED", completedAt: { $gte: since, $lte: now }, ...factoryFilter } },
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
export const getFleetSummary = async (req, res) => {
  try {
    const { start, end } = parseDates(req.query);

    const [activeVehicles, totalTrips, closedTrips] = await Promise.all([
      Vehicle.countDocuments({ isActive: true, ...factoryFilter }),
      Trip.countDocuments({ createdAt: { $gte: start, $lte: end }, ...factoryFilter }),
      Trip.countDocuments({ tripState: "CLOSED", completedAt: { $gte: start, $lte: end }, ...factoryFilter }),
    ]);

    const days            = daysBetween(start, end);
    const avgTripsPerDay  = totalTrips / days;

    // Top performer still a single vehicle — makes sense for KPI card
    const topVehicleAgg = await Trip.aggregate([
      { $match: { tripState: "CLOSED", completedAt: { $gte: start, $lte: end }, ...factoryFilter } },
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

const getISTDateKey = (date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
};


// --------------------------------- Overview Dashboard aggregation --------------------------


// ── Granularity helper ──────────────────────────────────────────────────
function getGranularity(days) {
  if (days <= 31)  return "day";
  if (days <= 180) return "week";
  return "month";
}

function bucketKey(dateStr, granularity) {
  const d = new Date(dateStr + "T00:00:00");
  if (granularity === "day") return dateStr;

  if (granularity === "week") {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toLocaleDateString("en-CA");
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function bucketLabel(key, granularity) {
  if (granularity === "day") {
    return new Date(key + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  if (granularity === "week") {
    const start = new Date(key + "T00:00:00");
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
  }
  const [y, m] = key.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+m - 1]} ${y}`;
}

function bucketDailySeries(dailyArr, days, countKey = "count") {
  const granularity = getGranularity(days);
  if (granularity === "day") {
    return { granularity, data: dailyArr.map(d => ({ ...d, label: bucketLabel(d.date, "day") })) };
  }

  const map = {};
  for (const d of dailyArr) {
    const key = bucketKey(d.date, granularity);
    map[key] = (map[key] || 0) + (d[countKey] || 0);
  }

  const data = Object.keys(map)
    .sort()
    .map(key => ({ date: key, label: bucketLabel(key, granularity), [countKey]: map[key] }));

  return { granularity, data };
}



export const getVehiclePerformanceTable = async (req, res) => {
  try {
    const { startDate, endDate, factory } = req.query;

    if (!factory) return res.status(400).json({ message: "factory is required" });

    const now = startDate && endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date();

    const since = startDate && endDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : (() => {
          const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d;
        })();

    // Full date spine for columns
    const days = Math.floor((now - since) / 86400000) + 1;
    const allDates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      allDates.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
    }

    const factoryObjId = new mongoose.Types.ObjectId(factory);

    const factoryFilter = {
      $or: [
        { destinationFactoryId: factoryObjId },
        { sourceFactoryId:      factoryObjId },
      ],
    };

    // Only internal trips at this factory
    const internalTripMatch = {
      createdAt: { $gte: since, $lte: now },
      type: "internal_transfer",
      ...factoryFilter,
    };

    // Aggregate via TripSegment — dedup by (vehicleId, tripId, date)
    const rows = await TripSegment.aggregate([
    {
      $match: {
        createdAt: { $gte: since, $lte: now },
        vehicleId: { $ne: null },
        ...factoryFilter,
      },
    },

    // ── Stage 1: dedup by (vehicleId, tripId, date) — carry classification fields ──
    {
      $group: {
        _id: {
          vehicleId: "$vehicleId",
          tripId:    "$tripId",
          date: {
            $dateToString: {
              format:   "%Y-%m-%d",
              date:     "$createdAt",
              timezone: "Asia/Kolkata",
            },
          },
          // classification lives on TripSegment directly
          triptype:            "$triptype",           // "INTERNAL" | "EXTERNAL"
          hasExternalDest:     { $gt: ["$externalDestination", null] },  // → Customer Delivery
          hasExternalSource:   { $gt: ["$externalSource",      null] },  // → From Customer
          hasDestFactory:      { $gt: ["$destinationFactoryId", null] },
          hasSourceFactory:    { $gt: ["$sourceFactoryId",      null] },
        },
      },
    },

    // ── Stage 2: count per (vehicle, date) ──
    {
      $group: {
        _id: {
          vehicleId: "$_id.vehicleId",
          date:      "$_id.date",
        },
        tripCount: { $sum: 1 },

        // INTERNAL + both factories present = Plant-to-Plant
        p2pCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ["$_id.triptype",         "INTERNAL"] },
                { $eq: ["$_id.hasDestFactory",   true] },
                { $eq: ["$_id.hasSourceFactory", true] },
              ]},
              1, 0,
            ],
          },
        },

        // EXTERNAL + externalDestination present = Customer Delivery
        customerDeliveryCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ["$_id.triptype",         "EXTERNAL"] },
                { $eq: ["$_id.hasExternalDest",  true] },
              ]},
              1, 0,
            ],
          },
        },

        // EXTERNAL + externalSource present = From Customer
        fromCustomerCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ["$_id.triptype",           "EXTERNAL"] },
                { $eq: ["$_id.hasExternalSource",  true] },
              ]},
              1, 0,
            ],
          },
        },
      },
    },

    // ── Stage 3: roll up to vehicle ──
    {
      $group: {
        _id:                   "$_id.vehicleId",
        totalTrips:            { $sum: "$tripCount" },
        activeDays:            { $sum: { $cond: [{ $gt: ["$tripCount", 0] }, 1, 0] } },
        p2pTotal:              { $sum: "$p2pCount" },
        customerDeliveryTotal: { $sum: "$customerDeliveryCount" },
        fromCustomerTotal:     { $sum: "$fromCustomerCount" },
        dailyTrips: {
          $push: {
            date:      "$_id.date",
            tripCount: "$tripCount",
          },
        },
      },
    },

    // ── Vehicle info ──
    {
      $lookup: {
        from:         "vehicles",
        localField:   "_id",
        foreignField: "_id",
        as:           "vehicle",
      },
    },

    {
      $project: {
        _id:           0,
        vehicleId:     "$_id",
        vehicleNumber: { $ifNull: [{ $arrayElemAt: ["$vehicle.vehicleNumber", 0] }, "Unknown"] },
        typeOfVehicle: { $ifNull: [{ $arrayElemAt: ["$vehicle.typeOfVehicle", 0] }, "—"] },
        type:          { $ifNull: [{ $arrayElemAt: ["$vehicle.type", 0] },          "unknown"] },
        transporterName: {
          $ifNull: [{ $arrayElemAt: ["$vehicle.transporterName", 0] }, "PGTL"],
        },
        ownerFactoryId:        { $arrayElemAt: ["$vehicle.ownerFactoryId", 0] },
        totalTrips:            1,
        activeDays:            1,
        p2pTotal:              1,
        customerDeliveryTotal: 1,
        fromCustomerTotal:     1,
        dailyTrips:            1,
      },
    },

    { $sort: { totalTrips: -1 } },
  ]);

    // Fill date spine + compute avgTripsPerDay
    const tableData = rows.map(v => {
      const dayMap = {};
      v.dailyTrips.forEach(d => { dayMap[d.date] = d.tripCount; });

      const filledDays = allDates.map(date => ({
        date,
        tripCount: dayMap[date] ?? 0,
      }));

      return {
        vehicleId:             v.vehicleId,
        vehicleNumber:         v.vehicleNumber,
        typeOfVehicle:         v.typeOfVehicle,
        type:                  v.type,
        transporterName:       v.transporterName,
        totalTrips:            v.totalTrips,
        activeDays:            v.activeDays,
        avgTripsPerDay:        +(v.totalTrips / Math.max(1, v.activeDays)).toFixed(1),
        p2pTotal:              v.p2pTotal,
        customerDeliveryTotal: v.customerDeliveryTotal,
        fromCustomerTotal:     v.fromCustomerTotal,
        dailyTrips:            filledDays,
      };
    });

    return res.json({
      since,
      now,
      dates:     allDates,   // column headers for the table
      tableData,
    });

  } catch (err) {
    console.error("Vehicle performance table error:", err);
    return res.status(500).json({ message: "Failed", error: err.message });
  }
};


export const driverSearch = async (req, res) => {
  try {
    const { q = "", startDate, endDate } = req.query;

    if (!q.trim()) {
      return res.status(400).json({ message: "Search query (q) is required" });
    }

    // ── Date bounds ──────────────────────────────────────────────────────────
    const now   = new Date();
    const since = startDate
      ? new Date(startDate)
      : (() => { const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();
    const until = endDate
      ? (() => { const d = new Date(endDate); d.setHours(23,59,59,999); return d; })()
      : now;

    // ── 1. Find matching drivers ─────────────────────────────────────────────
    // Match against: driverName (case-insensitive), driverContact, licenseNumber
    const term  = q.trim();
    const regex = new RegExp(term, "i");

    const drivers = await Driver.find({
      $or: [
        { driverName:    regex },
        { driverContact: regex },
        { licenseNumber: regex },
        { driverIdNumber: regex },
      ],
    })
      .limit(10)
      .lean();

    if (drivers.length === 0) {
      return res.json({ drivers: [], message: "No drivers found" });
    }

    // ── 2. For each matched driver fetch their trip stats ────────────────────
    const driverIds = drivers.map(d => d._id);

    const segmentStats = await TripSegment.aggregate([
      {
        $match: {
          driverId:  { $in: driverIds },
          createdAt: { $gte: since, $lte: until },
        },
      },
      // deduplicate: one row per (driver, trip)
      {
        $group: {
          _id: { driverId: "$driverId", tripId: "$tripId" },
        },
      },
      // join Trip for authoritative tripState
      {
        $lookup: {
          from:         "trips",
          localField:   "_id.tripId",
          foreignField: "_id",
          as:           "trip",
        },
      },
      { $unwind: { path: "$trip", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "factories",
          localField: "trip.sourceFactoryId",
          foreignField: "_id",
          as: "sourceFactory"
        }
        },
        {
        $unwind: {
          path: "$sourceFactory", preserveNullAndEmptyArrays: true
        }
        },
        {
        $lookup: {
          from: "factories",
          localField: "trip.destinationFactoryId",
          foreignField: "_id",
          as: "destinationFactory"
        }
        },
        {
        $unwind: {
          path: "$destinationFactory", preserveNullAndEmptyArrays: true
        }
        },
      // roll up per driver
      {
        $group: {
          _id:       "$_id.driverId",
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$trip.tripState", "CLOSED"]    }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$trip.tripState", "CANCELLED"] }, 1, 0] } },
          active:    { $sum: { $cond: [{ $in: ["$trip.tripState", ["ACTIVE","COMPLETED"]] }, 1, 0] } },
          // collect trip details for the timeline
          trips: {
            $push: {
              tripId:        "$trip._id",
              tripState:     "$trip.tripState",
              type:          "$trip.type",
              externalSource: "$trip.externalSource",
              externalDestination: "$trip.externalDestination",
               sourceFactory: {
                _id: "$sourceFactory._id",
                name: "$sourceFactory.name",
                location: "$sourceFactory.location"
              },

              destinationFactory: {
                _id: "$destinationFactory._id",
                name: "$destinationFactory.name",
                location: "$destinationFactory.location"
              },
              startedAt:     "$trip.startedAt",
              completedAt:   "$trip.completedAt",
              createdAt:     "$trip.createdAt",
            },
            
          },
        },
      },
    ]);

    // index stats by driverId string for O(1) lookup
    const statsMap = {};
    segmentStats.forEach(s => { statsMap[String(s._id)] = s; });

    // ── 3. Merge driver info + stats ─────────────────────────────────────────
    const result = drivers.map(driver => {
      const stats = statsMap[String(driver._id)] ?? {
        total: 0, completed: 0, cancelled: 0, active: 0, trips: [],
      };

      const completionRate = stats.total > 0
        ? +((stats.completed / stats.total) * 100).toFixed(1)
        : 0;

      // sort trips newest first
      const sortedTrips = (stats.trips ?? [])
        .filter(t => t.tripId) // remove nulls
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return {
        driverId:      driver._id,
        driverName:    driver.driverName,
        driverContact: driver.driverContact,
        licenseNumber: driver.licenseNumber,
        driverIdType:  driver.driverIdType,
        driverIdNumber:driver.driverIdNumber,
        isAssigned:    !!driver.assignedVehicle,
        assignedVehicle: driver.assignedVehicle,
        hasActiveTrip: !!driver.activeTripId,
        // lifetime stats from driver.stats field
        lifetimeStats: {
          totalTrips:    driver.stats?.totalTrips    ?? 0,
          totalDistance: driver.stats?.totalDistance ?? 0,
          totalTime:     driver.stats?.totalTime     ?? 0,
        },
        // period stats from segments
        periodStats: {
          total:          stats.total,
          completed:      stats.completed,
          cancelled:      stats.cancelled,
          active:         stats.active,
          completionRate,
        },
        recentTrips: sortedTrips.slice(0, 20),
      };
    });

    return res.json({
      query: term,
      since,
      until,
      drivers: result,
    });

  } catch (err) {
    console.error("Driver search error:", err);
    return res.status(500).json({ message: "Driver search failed", error: err.message });
  }
};

export const vehicleSearch = async (req, res) => {
  try {
    const { q = "", startDate, endDate } = req.query;

    if (!q.trim()) {
      return res.status(400).json({ message: "Search query (q) is required" });
    }

    // ── Date bounds ──────────────────────────────────────────────────────────
    const now   = new Date();
    const since = startDate
      ? new Date(startDate)
      : (() => { const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; })();
    const until = endDate
      ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
      : now;

    // ── 1. Find matching vehicles ────────────────────────────────────────────
    const term  = q.trim();
    const regex = new RegExp(term, "i");

    const vehicles = await Vehicle.find({
      $or: [
        { vehicleNumber:  regex },
        { typeOfVehicle:  regex },
        { transporterName: regex },
      ],
    })
      .limit(10)
      .populate("ownerFactoryId", "name location")
      .populate("currentFactoryId", "name location")
      .populate("driverId", "driverName driverContact licenseNumber")
      .lean();

    if (vehicles.length === 0) {
      return res.json({ vehicles: [], message: "No vehicles found" });
    }

    const vehicleIds = vehicles.map(v => v._id);

    // ── 2. Aggregate trip segments per vehicle within date range ─────────────
    const segmentStats = await TripSegment.aggregate([
      {
        $match: {
          vehicleId: { $in: vehicleIds },
          createdAt: { $gte: since, $lte: until },
        },
      },
      // deduplicate: one row per (vehicle, trip)
      {
        $group: {
          _id: { vehicleId: "$vehicleId", tripId: "$tripId" },
        },
      },
      // join Trip for authoritative state and metadata
      {
        $lookup: {
          from:         "trips",
          localField:   "_id.tripId",
          foreignField: "_id",
          as:           "trip",
        },
      },
      { $unwind: { path: "$trip", preserveNullAndEmptyArrays: true } },

      // join source factory
      {
        $lookup: {
          from:         "factories",
          localField:   "trip.sourceFactoryId",
          foreignField: "_id",
          as:           "sourceFactory",
        },
      },
      { $unwind: { path: "$sourceFactory", preserveNullAndEmptyArrays: true } },

      // join destination factory
      {
        $lookup: {
          from:         "factories",
          localField:   "trip.destinationFactoryId",
          foreignField: "_id",
          as:           "destinationFactory",
        },
      },
      { $unwind: { path: "$destinationFactory", preserveNullAndEmptyArrays: true } },

      // join driver
      {
        $lookup: {
          from:         "drivers",
          localField:   "trip.driverId",
          foreignField: "_id",
          as:           "driver",
        },
      },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },

      // roll up per vehicle
      {
        $group: {
          _id:       "$_id.vehicleId",
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$trip.tripState", "CLOSED"]     }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$trip.tripState", "CANCELLED"]  }, 1, 0] } },
          active:    { $sum: { $cond: [{ $in: ["$trip.tripState", ["ACTIVE", "COMPLETED"]] }, 1, 0] } },
          trips: {
            $push: {
              tripId:              "$trip._id",
              tripState:           "$trip.tripState",
              type:                "$trip.type",
              externalSource:      "$trip.externalSource",
              externalDestination: "$trip.externalDestination",
              sourceFactory: {
                _id:      "$sourceFactory._id",
                name:     "$sourceFactory.name",
                location: "$sourceFactory.location",
              },
              destinationFactory: {
                _id:      "$destinationFactory._id",
                name:     "$destinationFactory.name",
                location: "$destinationFactory.location",
              },
              // driver info per trip
              driver: {
                _id:           "$driver._id",
                driverName:    "$driver.driverName",
                driverContact: "$driver.driverContact",
                licenseNumber: "$driver.licenseNumber",
              },
              startedAt:   "$trip.startedAt",
              completedAt: "$trip.completedAt",
              createdAt:   "$trip.createdAt",
            },
          },
        },
      },
    ]);

    // index stats by vehicleId for O(1) lookup
    const statsMap = {};
    segmentStats.forEach(s => { statsMap[String(s._id)] = s; });

    // ── 3. Merge vehicle info + stats ────────────────────────────────────────
    const result = vehicles.map(vehicle => {
      const stats = statsMap[String(vehicle._id)] ?? {
        total: 0, completed: 0, cancelled: 0, active: 0, trips: [],
      };

      const completionRate = stats.total > 0
        ? +((stats.completed / stats.total) * 100).toFixed(1)
        : 0;

      // sort trips newest first, strip null tripIds
      const sortedTrips = (stats.trips ?? [])
        .filter(t => t.tripId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return {
        vehicleId:      vehicle._id,
        vehicleNumber:  vehicle.vehicleNumber,
        type:           vehicle.type,
        typeOfVehicle:  vehicle.typeOfVehicle,
        isActive:       vehicle.isActive,
        hasActiveTrip:  !!vehicle.currentTrip,
        ownerFactory:   vehicle.ownerFactoryId
          ? { id: vehicle.ownerFactoryId._id, name: vehicle.ownerFactoryId.name }
          : null,
        currentFactory: vehicle.currentFactoryId
          ? { id: vehicle.currentFactoryId._id, name: vehicle.currentFactoryId.name }
          : null,
        assignedDriver: vehicle.driverId
          ? {
              id:            vehicle.driverId._id,
              driverName:    vehicle.driverId.driverName,
              driverContact: vehicle.driverId.driverContact,
              licenseNumber: vehicle.driverId.licenseNumber,
            }
          : null,
        periodStats: {
          total:          stats.total,
          completed:      stats.completed,
          cancelled:      stats.cancelled,
          active:         stats.active,
          completionRate,
        },
        recentTrips: sortedTrips.slice(0, 20),
      };
    });

    return res.json({
      query: term,
      since,
      until,
      vehicles: result,
    });

  } catch (err) {
    console.error("Vehicle search error:", err);
    return res.status(500).json({ message: "Vehicle search failed", error: err.message });
  }
};

export const getTransporterCustomerTrend = async (req, res) => {
  try {
    const { transporterName, startDate, endDate } = req.query;
    const user = req.userId;
    const userLocation = req?.location ;
    if (!transporterName) {
      return res.status(400).json({ message: "transporterName is required" });
    }

    const now = new Date();
    const since = startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : (() => { const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();
    const until = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : now;

    // ── Step 1: find all vehicle IDs belonging to this transporter ──────────
    const transporterVehicles = await Vehicle.find(
      { transporterName: { $regex: new RegExp(`^${transporterName}$`, "i") } },
      { _id: 1 }
    ).lean();

    if (!transporterVehicles.length) {
      return res.status(200).json({
        transporterName,
        totalTrips: 0,
        customerCount: 0,
        customers: [],
      });
    }

    const vehicleIds = transporterVehicles.map(v => v._id);

    // ── Step 2: aggregate trips for those vehicles ───────────────────────────
    const trend = await Trip.aggregate([
      {
        $match: {
          vehicleId:  { $in: vehicleIds },
          createdAt:  { $gte: since, $lte: until },

        },
      },

      // Lookup vehicle to get vehicleNumber
      {
        $lookup: {
          from:         "vehicles",
          localField:   "vehicleId",
          foreignField: "_id",
          as:           "vehicle",
        },
      },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },

      // Lookup source factory
      {
        $lookup: {
          from:         "factories",
          localField:   "sourceFactoryId",
          foreignField: "_id",
          as:           "sourceFactory",
        },
      },

      // Lookup destination factory
      {
        $lookup: {
          from:         "factories",
          localField:   "destinationFactoryId",
          foreignField: "_id",
          as:           "destFactory",
        },
      },

      // Group by destination factory (= "customer" for internal transfers)
      {
        $group: {
          _id: "$destinationFactoryId",
          customerName: {
            $first: {
              $ifNull: [
                { $arrayElemAt: ["$destFactory.name", 0] },
                "$externalDestination",   // fallback if no factory linked
              ],
            },
          },
          totalTrips: { $sum: 1 },

          // Collect unique vehicles
          vehicleIds: { $addToSet: "$vehicleId" },

          // Collect per-vehicle trip counts
          vehicleTrips: {
            $push: {
              vehicleId:     "$vehicleId",
              vehicleNumber: "$vehicle.vehicleNumber",
            },
          },

          // Source factories involved
          sources: {
            $addToSet: {
              $ifNull: [
                { $arrayElemAt: ["$sourceFactory.name", 0] },
                "$externalSource",
              ],
            },
          },
        },
      },

      { $sort: { totalTrips: -1 } },
    ]);

    const totalTrips = trend.reduce((sum, i) => sum + i.totalTrips, 0);

    // ── Step 3: shape response ───────────────────────────────────────────────
    // Count trips per vehicle inside each customer group
    const result = trend.map((item) => {
      const vehicleCountMap = {};
      for (const v of item.vehicleTrips) {
        const key = v.vehicleId.toString();
        if (!vehicleCountMap[key]) {
          vehicleCountMap[key] = { vehicleId: v.vehicleId, vehicleNumber: v.vehicleNumber ?? "Unknown", tripCount: 0 };
        }
        vehicleCountMap[key].tripCount++;
      }

      return {
        customerId:   item._id,
        customerName: item.customerName ?? "Unknown",
        totalTrips:   item.totalTrips,
        vehicleCount: item.vehicleIds.length,
        sources:      item.sources.filter(Boolean),
        percentage:   totalTrips > 0
          ? Number(((item.totalTrips / totalTrips) * 100).toFixed(1))
          : 0,
        vehicles: Object.values(vehicleCountMap).sort((a, b) => b.tripCount - a.tripCount),
      };
    });

    return res.status(200).json({
      transporterName,
      totalTrips,
      customerCount: result.length,
      customers: result,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch transporter trend", error: err.message });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// Drop these into analyticscontroller.js (replace the existing versions).
// Everything else in that file stays as it is.
//
// Core idea: `vehicleId` is OPTIONAL. When it's missing, every endpoint
// returns fleet-wide data for the selected date range instead of a 400.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared context for every /vehicle-dashboard/* endpoint.
 *
 * Returns { vehicle, vid, since, now, factory, factoryFilter, vehicleType, days, period }
 *   - vehicle / vid are null when no (valid) vehicleId is supplied.
 *   - It never sends a 400 for a missing vehicleId.
 *
 * NOTE: I haven't seen your existing loadVehicleContext. If it also does
 * things like location scoping from req.location / req.userId, merge that in.
 */
export const loadVehicleContext = async (req, res, Vehicle) => {
  const {
    vehicleId,
    startDate,
    endDate,
    period = "month",
    factory,
    vehicleType = "all",
  } = req.query;

  // ── Optional vehicle ──────────────────────────────────────────────────────
  let vid = null;
  let vehicle = null;
  const hasVehicleId =
    vehicleId && vehicleId !== "undefined" && vehicleId !== "null";

  if (hasVehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
    const found = await Vehicle.findById(vehicleId).lean();
    // A stale / deleted id falls back to fleet-wide instead of failing the page.
    if (found) {
      vehicle = found;
      vid = found._id;
    }
  }

  // ── Date range: explicit range wins, otherwise derive from `period` ───────
  const now = endDate
    ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
    : new Date();

  let since;
  if (startDate) {
    since = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    const daysBack =
      { today: 0, yesterday: 1, week: 6, month: 29, quarter: 89 }[period] ?? 29;
    since = new Date(now);
    since.setDate(since.getDate() - daysBack);
    since.setHours(0, 0, 0, 0);
  }

  const days = Math.max(1, Math.floor((now - since) / 86400000) + 1);

  return {
    vehicle,
    vid,
    since,
    now,
    factory,
    factoryFilter: buildFactoryFilter(factory),
    vehicleType,
    days,
    period,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// /vehicle-dashboard/top
// Same ranking logic as the "Top 10 Vehicles" card (TripSegment, deduped by
// vehicle+trip, same date range + factory), so the "High Performed Vehicle"
// always matches #1 in that list. Previously this used Trip.completedAt +
// tripState CLOSED, which can be empty while the other cards have data.
// ─────────────────────────────────────────────────────────────────────────────
export const getTopVehicleId = async (req, res) => {
  try {
    const ctx = await loadVehicleContext(req, res, Vehicle);
    if (!ctx) return;
    const { since, now, factoryFilter } = ctx;

    const [top] = await TripSegment.aggregate([
      {
        $match: {
          createdAt: { $gte: since, $lte: now },
          vehicleId: { $ne: null },
          ...factoryFilter,
        },
      },
      { $group: { _id: { vehicleId: "$vehicleId", tripId: "$tripId" } } },
      { $group: { _id: "$_id.vehicleId", tripCount: { $sum: 1 } } },
      { $sort: { tripCount: -1 } },
      { $limit: 1 },
    ]);

    return res.json({ vehicleId: top?._id ?? null });
  } catch (err) {
    console.error("Error fetching top vehicle:", err);
    return res
      .status(500)
      .json({ message: "Could not fetch top vehicle", vehicleId: null });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// /vehicle-dashboard/summary
// - vehicle-specific stats only when a vehicle exists (vFilter)
// - fleet-wide donut / execution numbers, as before
// - percentages are NUMBERS (they were strings from toFixed, and NaN when
//   totalTrips was 0)
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleSummary = async (req, res) => {
  try {
    const ctx = await loadVehicleContext(req, res, Vehicle);
    if (!ctx) return;
    const { vehicle, vid, since, now, factoryFilter, days } = ctx;

    const vFilter = vid ? { vehicleId: vid } : {};
    const inRange = { createdAt: { $gte: since, $lte: now } };
    const pct = (n, d) => (d ? +((n / d) * 100).toFixed(1) : 0);

    const [
      periodTrips,
      allClosedTrips,
      firstTrip,
      totalTrips,
      totalClosedTrips,
      totalActiveTrips,
      totalCancelledTrips,
      totalInternalTrips,
      totalExternalTrips,
    ] = await Promise.all([
      Trip.find({ ...vFilter, ...inRange, ...factoryFilter }).lean(),
      Trip.countDocuments({ ...vFilter, tripState: "CLOSED", ...factoryFilter }),
      Trip.findOne({ ...vFilter, ...factoryFilter }).sort({ createdAt: 1 }).lean(),

      // fleet-wide counts for the period (unchanged behaviour)
      Trip.countDocuments({ ...inRange, ...factoryFilter }),
      Trip.countDocuments({ tripState: "CLOSED", ...inRange, ...factoryFilter }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, ...factoryFilter }),
      Trip.countDocuments({ tripState: "CANCELLED", ...inRange, ...factoryFilter }),
      Trip.countDocuments({ type: "internal_transfer", ...inRange, ...factoryFilter }),
      Trip.countDocuments({ type: "external_delivery", ...inRange, ...factoryFilter }),
    ]);

    const closed = periodTrips.filter((t) => t.tripState === "CLOSED");

    let activeSince = "—";
    if (firstTrip) {
      const daysSinceFirst = Math.max(
        1,
        Math.ceil((now - new Date(firstTrip.createdAt)) / 86400000)
      );
      const monthsActive = +(daysSinceFirst / 30).toFixed(1);
      const years = Math.floor(monthsActive / 12);
      const months = Math.round(monthsActive % 12);
      activeSince =
        years > 0
          ? `${years} Year${years > 1 ? "s" : ""} & ${months} Month${months !== 1 ? "s" : ""}`
          : `${months} Month${months !== 1 ? "s" : ""}`;
    }

    const closedPct = pct(totalClosedTrips, totalTrips);
    const activePct = pct(totalActiveTrips, totalTrips);
    const cancelledPct = pct(totalCancelledTrips, totalTrips);
    const internalPct = pct(totalInternalTrips, totalTrips);
    const externalPct = pct(totalExternalTrips, totalTrips);

    const totalTripHours = +closed
      .reduce((sum, t) => sum + getTripHours(t), 0)
      .toFixed(2);
    const avgTripsPerDay = +(closed.length / days).toFixed(1);

    return res.json({
      // null when there's no vehicle — the frontend renders an empty state
      vehicle: vehicle
        ? {
            id: vehicle._id,
            vehicleNumber: vehicle.vehicleNumber,
            typeOfVehicle: vehicle.typeOfVehicle,
            type: vehicle.type,
            isActive: vehicle.isActive,
            model: vehicle.model ?? vehicle.vehicleNumber,
          }
        : null,
      weeklyStats: {
        activeSince,
        totalClosedTrips: allClosedTrips,
        periodTrips: periodTrips.length,
        periodClosed: closed.length,
        avgTripsPerDay,
        totalTripHours,
      },
      sameDayColouser: {
        sohPct: closedPct,
        total: totalTrips,
        segments: [
          { label: "Completed", value: totalClosedTrips, pct: closedPct, color: "#0d9488" },
          { label: "Active", value: totalActiveTrips, pct: activePct, color: "#94a3b8" },
          { label: "Cancelled", value: totalCancelledTrips, pct: cancelledPct, color: "#fca5a5" },
        ],
        totalIssues: totalCancelledTrips,
      },
      tripExecution: {
        internalPct,
        externalPct,
        bars: [
          { label: "Internal", value: internalPct, color: "#0d9488" },
          { label: "External", value: externalPct, color: "#FF9D23" },
        ],
      },
      counts: { totalTrips, totalActiveTrips, totalInternalTrips, totalExternalTrips },
    });
  } catch (err) {
    console.error("Vehicle summary error:", err);
    return res.status(500).json({ message: "Vehicle summary failed", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// /vehicle-dashboard/usage — ONLY the two lines below change; the rest of the
// function stays exactly as you have it:
//
//   const { vid, since, now, factory, factoryFilter, days } = ctx;
//   const vFilter = vid ? { vehicleId: vid } : {};          // ← add
//
//   // BEFORE (bug: `vid` is not a field on Trip, so this filter was either
//   // stripped by Mongoose strictQuery or matched nothing):
//   const closed = await Trip.find({ vid, ...factoryFilter, createdAt: {...}, tripState: "CLOSED" }).lean();
//   // AFTER:
//   const closed = await Trip.find({ ...vFilter, ...factoryFilter, createdAt: { $gte: since, $lte: now }, tripState: "CLOSED" }).lean();
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// /vehicle-dashboard/trip-type-split — same optional filter
// ─────────────────────────────────────────────────────────────────────────────
export const getVehicleTripTypeSplit = async (req, res) => {
  try {
    const ctx = await loadVehicleContext(req, res, Vehicle);
    if (!ctx) return;
    const { vid, since, now, factoryFilter } = ctx;
    const vFilter = vid ? { vehicleId: vid } : {};

    const periodTrips = await Trip.find({
      ...vFilter,
      createdAt: { $gte: since, $lte: now },
      ...factoryFilter,
    }).lean();
    const closed = periodTrips.filter((t) => t.tripState === "CLOSED");

    const internalTrips = closed.filter((t) => t.type === "internal_transfer").length;
    const externalTrips = closed.filter((t) => t.type === "external_delivery").length;
    const otherTrips = closed.length - internalTrips - externalTrips;
    const totalTrips = periodTrips.length;
    const pct = (n) => (totalTrips ? +((n / totalTrips) * 100).toFixed(1) : 0);

    return res.json({
      tripTypeSplit: {
        donuts: [
          { label: "Internal", value: internalTrips, pct: pct(internalTrips), color: "#0d9488" },
          { label: "External", value: externalTrips, pct: pct(externalTrips), color: "#FF9D23" },
          { label: "Internal vs External", value: otherTrips, pct: pct(otherTrips), color: "#cbd5e1" },
        ],
      },
    });
  } catch (err) {
    console.error("Trip type split error:", err);
    return res.status(500).json({ message: "Trip type split failed", error: err.message });
  }
};

export const getVehicleUsage = async (req, res) => {
  try {
    const ctx = await loadVehicleContext(req, res, Vehicle);
    if (!ctx) return;
    const { vid, since, now, factory, factoryFilter, days } = ctx;
        const vFilter = vid ? { vehicleId: vid } : {};   // ← add this line

    const allClosedInPeriod = await Trip.find(
      { tripState: { $in: ["CLOSED", "CANCELLED"] }, completedAt: { $gte: since, $lte: now }, ...factoryFilter },
      { completedAt: 1 }
    ).lean();

    const dailyMap = {};
    allClosedInPeriod.forEach(t => {
      const key = getISTDateKey(t.completedAt);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });

    const dailyArr = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = getISTDateKey(d);
      dailyArr.push({ date: key, count: dailyMap[key] || 0 });
    }

    const { granularity, data: bucketedDailyArr } = bucketDailySeries(dailyArr, days, "count");

    const activeDays = Object.keys(dailyMap).length;
    const idleDays = Math.max(0, days - activeDays);
    const idleDayPct = +((idleDays / days) * 100).toFixed(1);

const closed = await Trip.find({ ...vFilter, ...factoryFilter, createdAt: { $gte: since, $lte: now }, tripState: "CLOSED" }).lean();    const totalTripHours = +closed.reduce((sum, t) => sum + getTripHours(t), 0).toFixed(2);
    const avgTripsPerDay = +(closed.length / days).toFixed(1);

    const factoryFlowStage = (matchExtra, groupOnActiveTrips = false) => [
      { $match: { ...matchExtra, ...factoryFilter } },
      ...(groupOnActiveTrips
        ? [
            { $lookup: { from: "factories", localField: "destinationFactoryId", foreignField: "_id", as: "f" } },
            {
              $addFields: {
                groupKey: {
                  $ifNull: ["$destinationFactoryId", { $concat: ["external:", { $ifNull: ["$externalDestination", "Unknown"] }] }],
                },
                resolvedName: {
                  $ifNull: [{ $arrayElemAt: ["$f.name", 0] }, { $ifNull: ["$externalDestination", "Unknown"] }],
                },
              },
            },
            { $group: { _id: "$groupKey", factoryName: { $first: "$resolvedName" }, count: { $sum: 1 } } },
          ]
        : [
            { $addFields: { reportingFactoryId: { $ifNull: ["$destinationFactoryId", "$sourceFactoryId"] } } },
            { $lookup: { from: "factories", localField: "reportingFactoryId", foreignField: "_id", as: "f" } },
            {
              $group: {
                _id: "$reportingFactoryId",
                factoryName: { $first: { $ifNull: [{ $arrayElemAt: ["$f.name", 0] }, "Unknown"] } },
                count: { $sum: 1 },
              },
            },
          ]),
      { $sort: { count: -1 } },
    ];

    const [factoryClosedTrips, factoryCancelledTrips, factoryActiveTrips] = await Promise.all([
      Trip.aggregate(factoryFlowStage({ tripState: "CLOSED", createdAt: { $gte: since, $lte: now } })),
      Trip.aggregate(factoryFlowStage({ tripState: "CANCELLED", createdAt: { $gte: since, $lte: now } })),
      Trip.aggregate(factoryFlowStage({ tripState: { $in: ["ACTIVE", "COMPLETED"] } }, true)),
    ]);

    return res.json({
      vehicleUsage: {
        totalHours: totalTripHours,
        avgTripsPerDay,
        dailyTrend: bucketedDailyArr,
        factoryChart: {
          closed: factoryClosedTrips.map(r => ({ factoryName: r.factoryName, count: r.count })),
          cancelled: factoryCancelledTrips.map(r => ({ factoryName: r.factoryName, count: r.count })),
          active: factoryActiveTrips.map(r => ({ factoryName: r.factoryName, count: r.count })),
        },
      },
      idleAnalysis: {
        idleDayPct,
        activeDays,
        idleDays,
        dailyTrend: bucketedDailyArr,
        bars: [
          { label: "Active Days", value: activeDays, max: days, color: "#0d9488" },
          { label: "Idle Days", value: idleDays, max: days, color: "#e2e8f0" },
        ],
      },
    });
  } catch (err) {
    console.error("Vehicle usage error:", err);
    return res.status(500).json({ message: "Vehicle usage failed", error: err.message });
  }
};


export const getVehicleWaitingAnalysis = async (req, res) => {
  try {
    const ctx = await loadVehicleContext(req, res, Vehicle);
    if (!ctx) return;
    const { factory } = ctx;
    if (!factory) return res.status(400).json({ message: "factory is required for waiting analysis" });

    const WAIT_THRESHOLD_MS = 4 * 60 * 60 * 1000;
    const waitCutoff = new Date(Date.now() - WAIT_THRESHOLD_MS);
    const fid = new mongoose.Types.ObjectId(factory);

    const outsideFactoryFilter = { destinationFactoryId: fid, phase: "DESTINATION" };
    const insideFactoryFilter = {
      $or: [
        { phase: "ORIGIN", sourceFactoryId: fid },
        { phase: "DESTINATION", destinationFactoryId: fid },
      ],
    };

    const [outsideWaiting, insideWaiting, totalOutside, totalInside, totalActiveTrips] = await Promise.all([
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, location: "outside_factory", arrivedAt: { $lte: waitCutoff }, checkedInAt: null, ...outsideFactoryFilter }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, location: "inside_factory", checkedInAt: { $lte: waitCutoff }, loadStatus: "pending", completedAt: null, ...insideFactoryFilter }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, location: "outside_factory", ...outsideFactoryFilter }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, location: "inside_factory", ...insideFactoryFilter }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, ...buildFactoryFilter(factory) }),
    ]);

    const outsideWaitPct = totalOutside ? +((outsideWaiting / totalOutside) * 100).toFixed(1) : 0;
    const insideWaitPct = totalInside ? +((insideWaiting / totalInside) * 100).toFixed(1) : 0;
    const totalWaiting = outsideWaiting + insideWaiting;
    const congestionRatioPct = totalActiveTrips ? +((totalWaiting / totalActiveTrips) * 100).toFixed(1) : 0;
    const congestionZone = congestionRatioPct < 10 ? "green" : congestionRatioPct <= 20 ? "yellow" : "red";

    return res.json({
      waitingAnalysis: {
        outsideWaiting: { count: outsideWaiting, total: totalOutside, pct: outsideWaitPct, label: "Outside Gate", description: "Arrived but not checked-in > 4hrs" },
        insideWaiting: { count: insideWaiting, total: totalInside, pct: insideWaitPct, label: "Inside Plant", description: "Checked-in but operations not performed by 4hrs" },
        congestion: { totalWaiting, totalActiveTrips, pct: congestionRatioPct, zone: congestionZone },
      },
    });
  } catch (err) {
    console.error("Waiting analysis error:", err);
    return res.status(500).json({ message: "Waiting analysis failed", error: err.message });
  }
};


export const getVehicleDriverAnalytics = async (req, res) => {
  try {
    const ctx = await loadVehicleContext(req, res, Vehicle);
    if (!ctx) return;
    const { since, now, factoryFilter } = ctx;

    const driverStats = await TripSegment.aggregate([
      { $match: { driverId: { $ne: null }, createdAt: { $gte: since, $lte: now }, ...factoryFilter } },
      { $group: { _id: { driverId: "$driverId", tripId: "$tripId" } } },
      { $lookup: { from: "trips", localField: "_id.tripId", foreignField: "_id", as: "trip" } },
      { $unwind: { path: "$trip", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id.driverId",
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$trip.tripState", "CLOSED"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$trip.tripState", "CANCELLED"] }, 1, 0] } },
          active: { $sum: { $cond: [{ $in: ["$trip.tripState", ["ACTIVE", "COMPLETED"]] }, 1, 0] } },
        },
      },
      { $lookup: { from: "drivers", localField: "_id", foreignField: "_id", as: "d" } },
      {
        $project: {
          _id: 0,
          driverId: "$_id",
          driverName: { $ifNull: [{ $arrayElemAt: ["$d.driverName", 0] }, "Unknown Driver"] },
          driverContact: { $ifNull: [{ $arrayElemAt: ["$d.driverContact", 0] }, "N/A"] },
          total: 1, completed: 1, cancelled: 1, active: 1,
          completionRate: {
            $cond: [{ $gt: ["$total", 0] }, { $round: [{ $multiply: [{ $divide: ["$completed", "$total"] }, 100] }, 1] }, 0],
          },
        },
      },
      { $sort: { completed: -1 } },
      { $limit: 20 },
    ]);

    return res.json({
      driverAnalytics: {
        drivers: driverStats,
        totals: {
          totalDrivers: driverStats.length,
          totalCompleted: driverStats.reduce((s, d) => s + d.completed, 0),
          totalCancelled: driverStats.reduce((s, d) => s + d.cancelled, 0),
          totalActive: driverStats.reduce((s, d) => s + d.active, 0),
        },
      },
    });
  } catch (err) {
    console.error("Driver analytics error:", err);
    return res.status(500).json({ message: "Driver analytics failed", error: err.message });
  }
};


export const getVehiclePgToPg = async (req, res) => {
  try {
    const ctx = await loadVehicleContext(req, res, Vehicle);
    if (!ctx) return;
    const { since, now, factory } = ctx;

    const breakdown = await TripSegment.aggregate([
      // Only filter on fields TripSegment definitely owns at this stage.
      { $match: { createdAt: { $gte: since, $lte: now }, status: {$in: ["CLOSED", "CANCELLED"]} } },
      { $lookup: { from: "trips", localField: "tripId", foreignField: "_id", as: "trip" } },
      { $unwind: "$trip" },
      {
        $match: {
          "trip.purpose": { $in: ["Delivery", "Pickup"] },
          ...(factory
            ? {
                $or: [
                  { "trip.destinationFactoryId": new mongoose.Types.ObjectId(factory) },
                  { "trip.sourceFactoryId": new mongoose.Types.ObjectId(factory) },
                ],
              }
            : {}),
        },
      },
      {
        $addFields: {
          purposeKey: { $toLower: "$trip.purpose" },
          kind: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ["$trip.destinationFactoryId", false] },
                  { $ifNull: ["$trip.sourceFactoryId", false] },
                ],
              },
              then: "p2p",
              else: "other",
            },
          },
        },
      },
      { $group: { _id: { tripId: "$tripId", segmentNumber: "$segmentNumber", purposeKey: "$purposeKey", kind: "$kind" } } },
      { $group: { _id: { purposeKey: "$_id.purposeKey", kind: "$_id.kind" }, count: { $sum: 1 } } },
    ]);

    const result = {
      delivery: { p2p: { count: 0 }, customerDelivery: { count: 0 } },
      pickup: { p2p: { count: 0 }, external: { count: 0 } },
    };

    for (const row of breakdown) {
      const { purposeKey, kind } = row._id;
      if (purposeKey === "delivery") {
        if (kind === "p2p") result.delivery.p2p.count = row.count;
        else result.delivery.customerDelivery.count = row.count;
      }
      if (purposeKey === "pickup") {
        if (kind === "p2p") result.pickup.p2p.count = row.count;
        else result.pickup.external.count = row.count;
      }
    }

    return res.json({ pgToPg: result });
  } catch (err) {
    console.error("PG-to-PG breakdown error:", err);
    return res.status(500).json({ message: "PG-to-PG breakdown failed", error: err.message });
  }
};


export const getTopVehiclesAndTransporters = async (req, res) => {
  try {
    const ctx = await loadVehicleContext(req, res, Vehicle);
    if (!ctx) return;
    const { since, now, factory, factoryFilter, vehicleType, days } = ctx;

    const allDates = buildAllDates(since, days);
    const regex = new RegExp(vehicleType === "all" ? "^(internal|external)$" : vehicleType, "i");

    // Expand date range to full months so partial selections still capture the whole month
    const monthSince = new Date(since.getFullYear(), since.getMonth(), 1);
    const monthNow = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const baseMatch = {
      createdAt: { $gte: since, $lte: now },
      vehicleId: { $ne: null },
      ...factoryFilter,
    };

    const [internalIds, externalIds] = await Promise.all([
      Vehicle.find({ type: "internal" }, { _id: 1 }).lean().then(r => r.map(v => v._id)),
      Vehicle.find({ type: "external" }, { _id: 1 }).lean().then(r => r.map(v => v._id)),
    ]);
    const internalSet = new Set(internalIds.map(String));
    const externalSet = new Set(externalIds.map(String));

    // ── allTopVehicles: dedup by (vehicleId, tripId) then rank by trip count ──
    const allTopVehicles = await TripSegment.aggregate([
      { $match: baseMatch },
      { $group: { _id: { vehicleId: "$vehicleId", tripId: "$tripId" } } },
      { $group: { _id: "$_id.vehicleId", tripCount: { $sum: 1 } } },
      { $sort: { tripCount: -1 } },
      { $limit: 30 }, // fetch more than 10 so each filtered slice still has up to 10
      { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "v" } },
      {
        $project: {
          _id: 0,
          vehicleId: "$_id",
          vehicleNumber: { $ifNull: [{ $arrayElemAt: ["$v.vehicleNumber", 0] }, "Unknown"] },
          vehicleType: { $ifNull: [{ $arrayElemAt: ["$v.type", 0] }, "unknown"] },
          tripCount: 1,
        },
      },
    ]);

    const slice = (list) => {
      const maxTrips = list[0]?.tripCount ?? 1;
      return {
        vehicles: list.slice(0, 10).map(v => ({ ...v, pct: +((v.tripCount / maxTrips) * 100).toFixed(1) })),
        maxTrips,
      };
    };

    const [top5Vehicles, top5Transporters, dailyTripsTrend, top25Vehicles, monthlyTrends] = await Promise.all([
      // Top 5 vehicles by trip count in the period
      Trip.aggregate([
        { $match: { createdAt: { $gte: since, $lte: now }, vehicleId: { $ne: null }, ...factoryFilter } },
        { $group: { _id: "$vehicleId", tripCount: { $sum: 1 } } },
        { $sort: { tripCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "v" } },
        {
          $project: {
            _id: 0,
            vehicleId: "$_id",
            tripCount: 1,
            vehicleNumber: { $ifNull: [{ $arrayElemAt: ["$v.vehicleNumber", 0] }, "Unknown"] },
            type: { $ifNull: [{ $arrayElemAt: ["$v.type", 0] }, "unknown"] },
          },
        },
      ]),

      // Top 5 transporters by trip count in period
      Vehicle.aggregate([
        { $match: { type: "external", transporterName: { $nin: [null, "", " "] } } },
        { $lookup: { from: "trips", localField: "_id", foreignField: "vehicleId", as: "trips" } },
        {
          $addFields: {
            tripCount: {
              $size: {
                $filter: {
                  input: "$trips",
                  as: "trip",
                  cond: {
                    $and: [
                      { $gte: ["$$trip.createdAt", since] },
                      { $lte: ["$$trip.createdAt", now] },
                      ...(factory
                        ? [{
                            $or: [
                              { $eq: ["$$trip.destinationFactoryId", new mongoose.Types.ObjectId(factory)] },
                              { $eq: ["$$trip.sourceFactoryId", new mongoose.Types.ObjectId(factory)] },
                            ],
                          }]
                        : []),
                    ],
                  },
                },
              },
            },
          },
        },
        { $group: { _id: "$transporterName", tripCount: { $sum: "$tripCount" }, vehicleCount: { $sum: 1 } } },
        { $sort: { tripCount: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, transporterName: "$_id", tripCount: 1, vehicleCount: 1 } },
      ]),

      // Daily trips trend
      Trip.aggregate([
        { $match: { createdAt: { $gte: since, $lte: now }, vehicleId: { $ne: null }, ...factoryFilter } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Top 25 vehicles with per-day trip counts
      TripSegment.aggregate([
        { $match: { createdAt: { $gte: since, $lte: now }, vehicleId: { $ne: null }, ...factoryFilter } },
        // Dedup by (vehicleId, tripId, date) first — same as allTopVehicles logic
        {
          $group: {
            _id: {
              vehicleId: "$vehicleId",
              tripId: "$tripId",
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
            },
          },
        },
        // Count unique trips per (vehicle, date)
        { $group: { _id: { vehicleId: "$_id.vehicleId", date: "$_id.date" }, tripCount: { $sum: 1 } } },
        { $sort: { "_id.vehicleId": 1, "_id.date": 1 } },
        // Roll up to vehicle level
        {
          $group: {
            _id: "$_id.vehicleId",
            totalTrips: { $sum: "$tripCount" },
            dailyTrips: { $push: { date: "$_id.date", tripCount: "$tripCount" } },
          },
        },
        { $lookup: { from: "vehicles", localField: "_id", foreignField: "_id", as: "vehicle" } },
        {
          $project: {
            _id: 0,
            vehicleId: "$_id",
            vehicleNumber: { $ifNull: [{ $arrayElemAt: ["$vehicle.vehicleNumber", 0] }, "Unknown"] },
            type: { $ifNull: [{ $arrayElemAt: ["$vehicle.type", 0] }, "unknown"] },
            totalTrips: 1,
            dailyTrips: 1,
          },
        },
        { $match: { type: regex } },
        { $sort: { totalTrips: -1 } },
        { $limit: 25 },
      ]),

      // Monthly trips trend (spans full months even for partial-month selections)
      Trip.aggregate([
        { $match: { createdAt: { $gte: monthSince, $lte: monthNow }, vehicleId: { $ne: null }, ...factoryFilter } },
        {
          $group: {
            _id: {
              year: { $year: { date: "$createdAt", timezone: "Asia/Kolkata" } },
              month: { $month: { date: "$createdAt", timezone: "Asia/Kolkata" } },
            },
            closed: { $sum: { $cond: [{ $eq: ["$tripState", "CLOSED"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$tripState", "CANCELLED"] }, 1, 0] } },
            active: { $sum: { $cond: [{ $in: ["$tripState", ["ACTIVE", "COMPLETED"]] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            label: {
              $let: {
                vars: { months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] },
                in: { $concat: [{ $arrayElemAt: ["$$months", { $subtract: ["$_id.month", 1] }] }, " ", { $toString: "$_id.year" }] },
              },
            },
            closed: 1, cancelled: 1, active: 1, total: 1,
          },
        },
      ]),
    ]);

    // ── Reshape daily trips trend, filling missing days with 0 ──────────────
    const tripsTrendMap = {};
    dailyTripsTrend.forEach(r => { tripsTrendMap[r._id] = r.count; });
    const dailyTripsTrendFilled = allDates.map(date => ({ date, count: tripsTrendMap[date] || 0 }));
    const { data: bucketedTripsTrend } = bucketDailySeries(dailyTripsTrendFilled, days, "count");

    // ── Fill missing days per vehicle in top25 ───────────────────────────────
    const top25WithFullDates = top25Vehicles.map(vehicle => {
      const dayMap = {};
      vehicle.dailyTrips.forEach(d => { dayMap[d.date] = d.tripCount; });
      return {
        ...vehicle,
        dailyTrips: allDates.map(date => ({ date, tripCount: dayMap[date] ?? 0 })),
      };
    });

    const top5AvgPerDay = top25WithFullDates
      .slice(0, 5)
      .map(v => ({
        vehicleNumber: v.vehicleNumber,
        type: v.type,
        totalTrips: v.totalTrips,
        activeDays: v.dailyTrips.filter(d => d.tripCount > 0).length,
        avgTripsPerDay: +(v.totalTrips / Math.max(1, v.dailyTrips.filter(d => d.tripCount > 0).length)).toFixed(1),
      }))
      .sort((a, b) => b.avgTripsPerDay - a.avgTripsPerDay);

    const top25Bucketed = top25WithFullDates.map(v => {
      const { data } = bucketDailySeries(v.dailyTrips, days, "tripCount");
      return { ...v, dailyTrips: data };
    });

    // ── busiestDays: needs its own dailyArr (closed trips per day) ───────────
    // Independent from getVehicleUsage's dailyArr — recomputed here since this
    // controller no longer shares state with that one.
    const allClosedInPeriod = await Trip.find(
      { tripState: { $in: ["CLOSED", "CANCELLED"] }, completedAt: { $gte: since, $lte: now }, ...factoryFilter },
      { completedAt: 1 }
    ).lean();

    const dailyMap = {};
    allClosedInPeriod.forEach(t => {
      const key = getISTDateKey(t.completedAt);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    });

    const dailyArr = allDates.map(date => ({ date, count: dailyMap[date] || 0 }));
    const busiestDays = [...dailyArr].sort((a, b) => b.count - a.count).slice(0, 15);

    return res.json({
      topVehiclesAndTransporters: {
        top5Vehicles,
        top5Transporters,
        dailyTripsTrend: bucketedTripsTrend,
        top25Vehicles: top25Bucketed,
        monthlyTrends,
        busiestDays,
        top5AvgPerDay,
      },
      topVehicles: {
        all: slice(allTopVehicles),
        internal: slice(allTopVehicles.filter(v => internalSet.has(String(v.vehicleId)))),
        external: slice(allTopVehicles.filter(v => externalSet.has(String(v.vehicleId)))),
      },
    });
  } catch (err) {
    console.error("Top vehicles/transporters error:", err);
    return res.status(500).json({ message: "Top vehicles/transporters failed", error: err.message });
  }
};




/* ------------------------------------------------------------------------ */
/*  Config — matches TripSchema enums exactly.                              */
/* ------------------------------------------------------------------------ */
const ACTIVE_TRIP_STATES = ["ACTIVE", "COMPLETED"]; // was: const ACTIVE_TRIP_STATE = "ACTIVE"
const INSIDE_LOCATION = "inside_factory";

const FG_MATERIAL = "FG"; 
const RM_MATERIAL = "RM";
const INTERNAL_TRIP_TYPE = "internal_transfer";
const READY_LOAD_STATUS = "loaded";


const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const FACTORY_COLOR_PALETTE = [
  "#1677ff",
  "#52c41a",
  "#eb2f96",
  "#faad14",
  "#13a8a8",
  "#722ed1",
  "#262626",
  "#fa541c",
];


const WAITING_MATCH = {
  tripState: { $in: ACTIVE_TRIP_STATES },
  waitingSince: { $ne: null },
  $or: [
    // waiting outside the destination gate, arrived but not checked in
    { location: "outside_factory", status: "ARRIVED", checkedInAt: null },
    // checked in inside the factory, but load/unload hasn't happened yet
    { location: "inside_factory", checkedInAt: { $ne: null }, loadStatus: "pending" },
  ],
};

function isStillWaiting(trip) {
  const outsideWaiting = trip.location === "outside_factory" && trip.status === "ARRIVED" && !trip.checkedInAt;
  const insideWaiting = trip.location === "inside_factory" && trip.checkedInAt && trip.loadStatus === "pending";
  return outsideWaiting || insideWaiting;
}

function getWaitingFactoryId(trip) {
  if (trip.location === "outside_factory" && !trip.checkedInAt) {
    return trip.destinationFactoryId?._id?.toString?.() || trip.destinationFactoryId?.toString?.() || null;
  }

  // Checked in, load/unload pending: attribute to wherever it's currently sitting.
  if (trip.location === "inside_factory" && trip.checkedInAt) {
    return trip.currentFactoryId?._id?.toString?.() || trip.currentFactoryId?.toString?.() || null;
  }

  return null;
}

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildLocationMetricFilters = () => ({
  insideNow: {
    tripState: { $in: ACTIVE_TRIP_STATES },
    location: INSIDE_LOCATION,
  },
  fgVehicles: {
    tripState: { $in: ACTIVE_TRIP_STATES },
    location: INSIDE_LOCATION,
    "materials.name": FG_MATERIAL,
  },
  rmVehicles: {
    tripState: { $in: ACTIVE_TRIP_STATES },
    location: INSIDE_LOCATION,
    "materials.name": RM_MATERIAL,
  },
  internalShifts: {
    tripState: { $in: ACTIVE_TRIP_STATES },
    type: INTERNAL_TRIP_TYPE,
  },
  ready: {
    tripState: { $in: ACTIVE_TRIP_STATES },
    loadStatus: READY_LOAD_STATUS,
  },
  // thisMonth removed — see computeThisMonthSegmentsByFactory()
});


const WAITING_FIELDS = "tripState waitingSince location status checkedInAt loadStatus phase arrivedAt sourceFactoryId destinationFactoryId currentFactoryId";

/**
 * Fetches every currently-waiting trip once, resolves each to its alert
 * factory, and buckets it into delay4hrs / delay12hrs / overstay counts.
 * Buckets are cumulative (a 30-hour wait counts in all three), matching how
 * the original card UI treated these as nested severity tiers.
 */
async function computeWaitingMetricsByFactory() {
  const waitingTrips = await Trip.find(WAITING_MATCH).select(WAITING_FIELDS).lean();

  const now = Date.now();
  const byFactory = {};

  for (const trip of waitingTrips) {
    if (!isStillWaiting(trip)) continue;

    const factoryId = getWaitingFactoryId(trip);
    if (!factoryId) continue;

    const waitedMs = now - new Date(trip.waitingSince).getTime();

    byFactory[factoryId] = byFactory[factoryId] || { delay4hrs: 0, delay12hrs: 0, overstay: 0 };
    if (waitedMs >= FOUR_HOURS_MS) byFactory[factoryId].delay4hrs += 1;
    if (waitedMs >= TWELVE_HOURS_MS) byFactory[factoryId].delay12hrs += 1;
    if (waitedMs >= ONE_DAY_MS) byFactory[factoryId].overstay += 1;
  }

  return byFactory;
}

async function getFactoryDirectory(locationName) {
  const query = { isDeleted: false, status: "active" };
  if (locationName) {
    query.location = { $regex: `^${escapeRegExp(locationName)}$`, $options: "i" };
  }

  const docs = await Factory.find(query).select("name location").lean();

  if (docs.length) {
    return docs.map((d) => ({ _id: d._id, name: d.name, location: d.location || null }));
  }

  if (!locationName) {
    const ids = await Vehicle.distinct("currentFactoryId", { currentFactoryId: { $ne: null } });
    return ids.map((id) => ({ _id: id, name: id.toString().slice(-6).toUpperCase(), location: null }));
  }

  return [];
}

/**
 * "Active Trips" for a factory = any trip currently touching it as either
 * endpoint (source or destination), regardless of currentFactoryId/location —
 * matches the gate dashboard's "all" scope. A trip whose source and
 * destination are different factories counts once toward each.
 */
async function computeActiveTripsByFactory() {
  return Trip.aggregate([
    {
      $match: {
        tripState: { $in: ACTIVE_TRIP_STATES },
        $or: [
          { sourceFactoryId: { $ne: null } },
          { destinationFactoryId: { $ne: null } },
        ],
      },
    },
    {
      $project: {
        factoryIds: {
          $setUnion: [
            { $cond: [{ $ne: ["$sourceFactoryId", null] }, ["$sourceFactoryId"], []] },
            { $cond: [{ $ne: ["$destinationFactoryId", null] }, ["$destinationFactoryId"], []] },
          ],
        },
      },
    },
    { $unwind: "$factoryIds" },
    { $group: { _id: "$factoryIds", count: { $sum: 1 } } },
  ]);
}

async function computeThisMonthSegmentsByFactory() {
  return TripSegment.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth() },
        $or: [
          { sourceFactoryId: { $ne: null } },
          { destinationFactoryId: { $ne: null } },
        ],
      },
    },
    {
      $project: {
        factoryIds: {
          $setUnion: [
            { $cond: [{ $ne: ["$sourceFactoryId", null] }, ["$sourceFactoryId"], []] },
            { $cond: [{ $ne: ["$destinationFactoryId", null] }, ["$destinationFactoryId"], []] },
          ],
        },
      },
    },
    { $unwind: "$factoryIds" },
    { $group: { _id: "$factoryIds", count: { $sum: 1 } } },
  ]);
}



/* ------------------------------------------------------------------------ */
/*  GET /analytics/executive-dashboard/:factoryId/:metricKey                */
/*  Powers the drawer: list of vehicles behind one cell in one factory row. */
/* ------------------------------------------------------------------------ */
const WAITING_METRIC_THRESHOLDS_MS = {
  delay4hrs: FOUR_HOURS_MS,
  delay12hrs: TWELVE_HOURS_MS,
  overstay: ONE_DAY_MS,
};

export const getFactoryVehicleDetails = asyncHandler(async (req, res, next) => {
  const { factoryId, metricKey } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
 
  if (!mongoose.Types.ObjectId.isValid(factoryId)) {
    return next(new AppError("Invalid factoryId", 400));
  }
 
  const locationFilters = buildLocationMetricFilters(); // no thisMonth key anymore
  const isWaitingMetric = Object.prototype.hasOwnProperty.call(WAITING_METRIC_THRESHOLDS_MS, metricKey);
  const isActiveTripsMetric = metricKey === "activeTrips";
  const isThisMonthMetric = metricKey === "thisMonth";
 
  if (!isWaitingMetric && !isActiveTripsMetric && !isThisMonthMetric && !locationFilters[metricKey]) {
    return next(
      new AppError(
        `Unknown metric '${metricKey}'. Expected one of: ${[
          ...Object.keys(locationFilters),
          "activeTrips",
          "thisMonth",
          ...Object.keys(WAITING_METRIC_THRESHOLDS_MS),
        ].join(", ")}`,
        400
      )
    );
  }
 
  let trips;
  let total;
  let vehicles;
 
  if (isWaitingMetric) {
    const thresholdMs = WAITING_METRIC_THRESHOLDS_MS[metricKey];
    const now = Date.now();
 
    const waitingTrips = await Trip.find(WAITING_MATCH)
      .populate({ path: "vehicleId", select: "vehicleNumber typeOfVehicle" })
      .populate({ path: "driverId", select: "driverName driverContact licenseNumber" })
      .populate({ path: "sourceFactoryId", select: "name location" })
      .populate({ path: "destinationFactoryId", select: "name location" })
      .populate({ path: "currentFactoryId", select: "name location" })
      .lean();
 
    const filtered = waitingTrips.filter((t) => {
      if (!isStillWaiting(t)) return false;
      if (getWaitingFactoryId(t) !== factoryId) return false;
      const waitedMs = now - new Date(t.waitingSince).getTime();
      return waitedMs >= thresholdMs;
    });
 
    filtered.sort((a, b) => new Date(a.waitingSince || a.createdAt) - new Date(b.waitingSince || b.createdAt));
 
    total = filtered.length;
    trips = filtered.slice(skip, skip + limit);
 
  } else if (isActiveTripsMetric) {
    const fid = new mongoose.Types.ObjectId(factoryId);
    const baseMatch = {
      tripState: { $in: ACTIVE_TRIP_STATES },
      $or: [{ sourceFactoryId: fid }, { destinationFactoryId: fid }],
    };
 
    [total, trips] = await Promise.all([
      Trip.countDocuments(baseMatch),
      Trip.find(baseMatch)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "vehicleId", select: "vehicleNumber typeOfVehicle" })
        .populate({ path: "driverId", select: "driverName driverContact licenseNumber" })
        .populate({ path: "sourceFactoryId", select: "name location" })
        .populate({ path: "destinationFactoryId", select: "name location" })
        .populate({ path: "currentFactoryId", select: "name location" })
        .lean(),
    ]);
 
  } else if (isThisMonthMetric) {
    // TripSegment-based: "this month" means round-trip legs (source->dest
    // or dest->source), not current Trip documents.
    const fid = new mongoose.Types.ObjectId(factoryId);
    const baseMatch = {
      createdAt: { $gte: startOfMonth() },
      $or: [{ sourceFactoryId: fid }, { destinationFactoryId: fid }],
    };
 
    const [segTotal, segments] = await Promise.all([
      TripSegment.countDocuments(baseMatch),
      TripSegment.find(baseMatch)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "vehicleId", select: "vehicleNumber typeOfVehicle" })
        .populate({ path: "driverId", select: "driverName driverContact licenseNumber" })
        .populate({ path: "sourceFactoryId", select: "name location" })
        .populate({ path: "destinationFactoryId", select: "name location" })
        .lean(),
    ]);
 
    total = segTotal;
 
    // Segment-specific mapper — deliberately NOT the shared Trip mapper below.
    vehicles = segments.map((seg) => {
      const durationMinutes =
        seg.startedAt && seg.completedAt
          ? Math.round((new Date(seg.completedAt) - new Date(seg.startedAt)) / 60000)
          : null;
 
      return {
        tripId: seg.tripId,
        segmentId: seg._id,
        segmentNumber: seg.segmentNumber,
        vehicleNo: seg.vehicleId?.vehicleNumber || null,
        type: seg.materials?.name || null, // materials is a single object on TripSegment, not an array
        typeOfVehicle: seg.vehicleId?.typeOfVehicle || null,
        driverName: seg.driverId?.driverName || null,
        driverPhone: seg.driverId?.driverContact || null,
        entryTime: seg.startedAt || seg.createdAt,
        waitingSince: null,
        durationMinutes,
        duration:
          durationMinutes !== null
            ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
            : null,
        purpose: seg.purpose,
        status: "thisMonth",
        lastAction: null, // TripSegment has no tripHistory log to pull a "last action" from
        tripDetails: {
          purpose: seg.purpose,
          tripType: seg.triptype,
          sourceFactory: {
            name: seg.sourceFactoryId?.name || seg.externalSource || null,
            location: seg.sourceFactoryId?.location || null,
          },
          destinationFactory: {
            name: seg.destinationFactoryId?.name || seg.externalDestination || null,
            location: seg.destinationFactoryId?.location || null,
          },
          currentFactory: null, // not meaningful for a historical/completed leg
          tripState: null,
          loadStatus: null,
          segmentStatus: seg.status, // ACTIVE/COMPLETED/CANCELLED/ROUTE_CHANGED/CLOSED — not Trip.tripState
          startedAt: seg.startedAt,
          completedAt: seg.completedAt,
        },
      };
    });
 
  } else {
    const baseMatch = {
      currentFactoryId: new mongoose.Types.ObjectId(factoryId),
      ...locationFilters[metricKey],
    };
 
    [total, trips] = await Promise.all([
      Trip.countDocuments(baseMatch),
      Trip.find(baseMatch)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "vehicleId", select: "vehicleNumber typeOfVehicle" })
        .populate({ path: "driverId", select: "driverName driverContact licenseNumber" })
        .populate({ path: "sourceFactoryId", select: "name location" })
        .populate({ path: "destinationFactoryId", select: "name location" })
        .populate({ path: "currentFactoryId", select: "name location" })
        .lean(),
    ]);
  }
 
  if (!isWaitingMetric && !isThisMonthMetric) {
    trips.sort((a, b) => new Date(a.waitingSince || a.createdAt) - new Date(b.waitingSince || b.createdAt));
  }
 
  if (!isThisMonthMetric) {
    const sortedHistory = (t) =>
      Array.isArray(t.tripHistory)
        ? [...t.tripHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        : [];
 
    vehicles = trips.map((t) => {
      const waitingMs = t.waitingSince ? Date.now() - new Date(t.waitingSince).getTime() : null;
      const durationMinutes = waitingMs !== null ? Math.round(waitingMs / 60000) : null;
      const history = sortedHistory(t);
      const lastEvent = history[history.length - 1] || null;
 
      return {
        tripId: t._id,
        vehicleNo: t.vehicleId?.vehicleNumber || null,
        type: t.materials?.[0]?.name || null,
        typeOfVehicle: t.vehicleId?.typeOfVehicle || null,
        driverName: t.driverId?.driverName || null,
        driverPhone: t.driverId?.driverContact || null,
        entryTime: t.startedAt || t.createdAt,
        waitingSince: t.waitingSince,
        durationMinutes,
        duration: durationMinutes !== null ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : null,
        purpose: t.purpose,
        status: metricKey,
        lastAction: lastEvent
          ? { action: lastEvent.action, timestamp: lastEvent.timestamp, actionLocation: lastEvent.actionLocation || null, actionBy: lastEvent.actionBy || null }
          : null,
        tripDetails: {
          purpose: t.purpose,
          tripType: t.type,
          sourceFactory: { name: t.sourceFactoryId?.name || t.externalSource || null, location: t.sourceFactoryId?.location || null },
          destinationFactory: { name: t.destinationFactoryId?.name || t.externalDestination || null, location: t.destinationFactoryId?.location || null },
          currentFactory: { name: t.currentFactoryId?.name || null, location: t.currentFactoryId?.location || null },
          tripState: t.tripState,
          loadStatus: t.loadStatus,
        },
      };
    });
  }
 
  const hasMore = skip + vehicles.length < total;
 
  return res.status(200).json({
    success: true,
    factoryId,
    metricKey,
    page,
    limit,
    total,
    count: vehicles.length,
    hasMore,
    nextPage: hasMore ? page + 1 : null,
    data: vehicles,
  });
});



/* ------------------------------------------------------------------------ */
/*  Shared row builder                                                      */
/*  Same logic that used to live inline in getExecutiveDashboardSummary —   */
/*  pulled out so the JSON endpoint and the new XLSX endpoint can never     */
/*  drift out of sync with each other.                                     */
/* ------------------------------------------------------------------------ */
async function buildExecutiveDashboardRows(location) {
  const locationFilters = buildLocationMetricFilters(); // no longer has thisMonth
  const metricKeys = Object.keys(locationFilters);
 
  const [locationResults, waitingMetrics, activeTripsResults, thisMonthResults, factories] =
    await Promise.all([
      Promise.all(
        metricKeys.map((key) =>
          Trip.aggregate([
            { $match: locationFilters[key] },
            { $group: { _id: "$currentFactoryId", count: { $sum: 1 } } },
          ])
        )
      ),
      computeWaitingMetricsByFactory(),
      computeActiveTripsByFactory(),
      computeThisMonthSegmentsByFactory(),
      getFactoryDirectory(location),
    ]);
 
  const factoryMetrics = {};
  metricKeys.forEach((key, i) => {
    locationResults[i].forEach(({ _id, count }) => {
      if (!_id) return;
      const fid = _id.toString();
      factoryMetrics[fid] = factoryMetrics[fid] || {};
      factoryMetrics[fid][key] = count;
    });
  });
  Object.entries(waitingMetrics).forEach(([fid, metrics]) => {
    factoryMetrics[fid] = { ...factoryMetrics[fid], ...metrics };
  });
  activeTripsResults.forEach(({ _id, count }) => {
    if (!_id) return;
    const fid = _id.toString();
    factoryMetrics[fid] = factoryMetrics[fid] || {};
    factoryMetrics[fid].activeTrips = count;
  });
  thisMonthResults.forEach(({ _id, count }) => {
    if (!_id) return;
    const fid = _id.toString();
    factoryMetrics[fid] = factoryMetrics[fid] || {};
    factoryMetrics[fid].thisMonth = count;
  });
 
  return factories.map((f, idx) => {
    const fid = f._id.toString();
    const m = factoryMetrics[fid] || {};
    return {
      key: fid,
      factory: f.name,
      location: f.location || "N/A",
      color: FACTORY_COLOR_PALETTE[idx % FACTORY_COLOR_PALETTE.length],
      insideNow: m.insideNow || 0,
      activeTrips: m.activeTrips || 0,
      fgVehicles: m.fgVehicles || 0,
      rmVehicles: m.rmVehicles || 0,
      internalShifts: m.internalShifts || 0,
      delay4hrs: m.delay4hrs || 0,
      delay12hrs: m.delay12hrs || 0,
      thisMonth: m.thisMonth || 0, // now segment-based
      overstay: m.overstay || 0,
      ready: m.ready || 0,
    };
  });
}


/**
 * "All Plants" summary row — sums every factory row per metric column,
 * matching the black totals bar at the top of the dashboard table.
 */
function computeTotalsRow(rows) {
  const sumKeys = [
    "insideNow",
    "activeTrips",
    "fgVehicles",
    "rmVehicles",
    "internalShifts",
    "delay4hrs",
    "delay12hrs",
    "thisMonth",
    "overstay",
    "ready",
  ];
  const totals = { factory: "All Plants", location: "" };
  sumKeys.forEach((k) => {
    totals[k] = rows.reduce((sum, r) => sum + (r[k] || 0), 0);
  });
  return totals;
}

/* ------------------------------------------------------------------------ */
/*  Existing JSON endpoint — now just a thin wrapper around the shared      */
/*  row builder. Behavior is unchanged.                                    */
/* ------------------------------------------------------------------------ */
export const getExecutiveDashboardSummary = asyncHandler(async (req, res) => {
  const rawLocation = req.params.location || req.query.location || null;
  const location = rawLocation && rawLocation.toLowerCase() !== "all" ? rawLocation : null;

  const rows = await buildExecutiveDashboardRows(location);

  res.status(200).json({ success: true, data: rows });
});

/* ------------------------------------------------------------------------ */
/*  GET /analytics/executive-dashboard/download                            */
/*  Streams the same table shown on screen as a .xlsx download.            */
/* ------------------------------------------------------------------------ */
const EXPORT_COLUMNS = [
  { header: "Factory", key: "factory", width: 24 },
  { header: "Location", key: "location", width: 16 },
  { header: "Active Trips", key: "activeTrips", width: 13 },
  { header: "Inside Now", key: "insideNow", width: 12 },
  { header: "FG Vehicles", key: "fgVehicles", width: 12 },
  { header: "RM Vehicles", key: "rmVehicles", width: 12 },
  { header: "Internal Shift", key: "internalShifts", width: 14 },
  { header: "Waiting > 4 Hrs", key: "delay4hrs", width: 15 },
  { header: "Waiting > 12 Hrs", key: "delay12hrs", width: 16 },
  { header: "24+ Hrs Delay", key: "overstay", width: 14 },
  { header: "This Month", key: "thisMonth", width: 12 },
  { header: "Ready", key: "ready", width: 10 },
];

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
const TOTALS_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
const OVERSTAY_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4E4" } };

export const downloadExecutiveDashboardExcel = asyncHandler(async (req, res) => {
  const rawLocation = req.params.location || req.query.location || null;
  const location = rawLocation && rawLocation.toLowerCase() !== "all" ? rawLocation : null;

  const rows = await buildExecutiveDashboardRows(location);
  const totals = computeTotalsRow(rows);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VEMS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Executive Dashboard", {
    views: [{ state: "frozen", ySplit: 2 }],
  });
  sheet.columns = EXPORT_COLUMNS;

  // header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = HEADER_FILL;
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;

  // "All Plants" totals row — row 2, mirrors the black bar in the UI
  const totalsRow = sheet.addRow(totals);
  totalsRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  totalsRow.fill = TOTALS_FILL;
  totalsRow.alignment = { vertical: "middle", horizontal: "center" };
  totalsRow.getCell("factory").alignment = { vertical: "middle", horizontal: "left" };

  // one row per factory
  rows.forEach((r) => {
    const row = sheet.addRow(r);
    row.alignment = { vertical: "middle", horizontal: "center" };
    row.getCell("factory").alignment = { vertical: "middle", horizontal: "left" };
    row.getCell("location").alignment = { vertical: "middle", horizontal: "left" };

    // mirror the red-tinted overstay cell from the UI
    if (r.overstay > 0) {
      const cell = row.getCell("overstay");
      cell.fill = OVERSTAY_FILL;
      cell.font = { color: { argb: "FFB91C1C" }, bold: true };
    }
  });

  sheet.autoFilter = {
    from: "A1",
    to: `${sheet.getColumn(EXPORT_COLUMNS.length).letter}1`,
  };

  const locationLabel = location ? location.replace(/[^a-z0-9]+/gi, "_") : "All_Plants";
  const filename = `executive-dashboard-${locationLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  // let the client read the filename off the header via a CORS allowlist
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  await workbook.xlsx.write(res);
  res.end();
});






// GET /analytics/trip-finder/:tripId
// Returns a trip summary (from Trip) plus the full history from TripSegment,
// ordered oldest → newest by segmentNumber.

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const pickFactory = (f) =>
  f && typeof f === "object"
    ? { _id: f._id, name: f.name, location: f.location }
    : null;

const pickVehicle = (v) =>
  v && typeof v === "object"
    ? {
        _id: v._id,
        vehicleNumber: v.vehicleNumber,
        type: v.type,
        typeOfVehicle: v.typeOfVehicle,
        transporterName: v.transporterName ?? null,
      }
    : null;

const pickDriver = (d) =>
  d && typeof d === "object"
    ? {
        _id: d._id,
        driverName: d.driverName,
        driverContact: d.driverContact,
        licenseNumber: d.licenseNumber,
      }
    : null;

// Embedded Trip.tripHistory entry -> flat, UI-ready event
const placeOf = (factory, external) =>
  factory?.name || (typeof external === "string" && external.trim() ? external.trim() : null);

// Older entries may have no tripSegmentId: use the segment that was open at that time
const segmentAt = (segments, ts) => {
  if (!ts) return null;
  const t = new Date(ts).getTime();
  let found = null;
  for (const s of segments) {
    if (s.startedAt && new Date(s.startedAt).getTime() <= t) found = s;
  }
  return found ?? segments[0] ?? null;
};

const formatEvent = (h, segments, segNoById) => {
  const seg = h.tripSegmentId ? null : segmentAt(segments, h.timestamp);
  const segId = h.tripSegmentId ?? seg?._id ?? null;
  const route = h.segment
    ? {
        from: placeOf(h.segment.sourceFactoryId, h.segment.externalSource),
        to: placeOf(h.segment.destinationFactoryId, h.segment.externalDestination),
      }
    : null;
  return {
    _id: h._id,
    tripSegmentId: segId,
    segmentNumber: segId ? segNoById.get(String(segId)) ?? null : null,
    action: h.action,
    state: { status: h.status, phase: h.phase, location: h.location },
    factory: pickFactory(h.factoryId),
    actor: {
      email: h.actionBy ?? null,
      workLocation: h.actionLocation ?? null,
      siteName: h.actionDetails?.siteId?.name ?? null,
      blockName: h.actionDetails?.blockId?.name ?? null,
    },
    route: route && (route.from || route.to) ? route : null,
    device: h.deviceDetails ?? null,
    timestamp: h.timestamp,
  };
};

export const tripFinder = async (req, res) => {
  try {
    const tripId = String(req.params.tripId || "").trim();

    if (!OBJECT_ID_RE.test(tripId)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    const [trip, segments] = await Promise.all([
      Trip.findById(tripId)
        .select(
          "type phase location status tripState purpose loadStatus isIntraPlant reason " +
          "createdAt startedAt completedAt checkedInAt currentSegment " +
          "vehicleId driverId sourceFactoryId destinationFactoryId currentFactoryId tripHistory"
        )
        .populate("vehicleId", "vehicleNumber type typeOfVehicle transporterName")
        .populate("driverId", "driverName driverContact licenseNumber")
        .populate("sourceFactoryId", "name location")
        .populate("destinationFactoryId", "name location")
        .populate("currentFactoryId", "name location")
        .populate("tripHistory.factoryId", "name location")
        .populate("tripHistory.actionDetails.siteId", "name")
        .populate("tripHistory.actionDetails.blockId", "name")
        .populate("tripHistory.segment.sourceFactoryId", "name")
        .populate("tripHistory.segment.destinationFactoryId", "name")
        .lean(),

      TripSegment.find({ tripId })
        .sort({ segmentNumber: 1, createdAt: 1 })
        .populate("sourceFactoryId", "name location")
        .populate("destinationFactoryId", "name location")
        .populate("vehicleId", "vehicleNumber type typeOfVehicle transporterName")
        .populate("driverId", "driverName driverContact licenseNumber")
        .lean(),

    ]);

    if (!trip && segments.length === 0) {
      return res.status(404).json({ success: false, message: "No trip found for this ID" });
    }

    const currentSegmentId = trip?.currentSegment ? String(trip.currentSegment) : null;

    const formattedSegments = segments.map((seg) => ({
      _id: seg._id,
      tripId: seg.tripId,
      segmentNumber: seg.segmentNumber,
      triptype: seg.triptype,
      purpose: seg.purpose ?? null,
      status: seg.status,
      isCurrent: currentSegmentId
        ? String(seg._id) === currentSegmentId
        : seg.status === "ACTIVE",
      externalSource: seg.externalSource ?? null,
      externalDestination: seg.externalDestination ?? null,
      sourceFactory: pickFactory(seg.sourceFactoryId),
      destinationFactory: pickFactory(seg.destinationFactoryId),
      vehicle: pickVehicle(seg.vehicleId),
      driver: pickDriver(seg.driverId),
      material: seg.materials ?? null,
      startedAt: seg.startedAt ?? null,
      completedAt: seg.completedAt ?? null,
      routeChangeReason: seg.routeChangeReason ?? null,
      createdAt: seg.createdAt,
    }));

    const segNoById = new Map(segments.map((s) => [String(s._id), s.segmentNumber]));
    const history = (trip?.tripHistory ?? [])
      .map((h) => formatEvent(h, segments, segNoById))
      .sort((x, y) => new Date(x.timestamp) - new Date(y.timestamp));

    const formattedTrip = trip
      ? {
          _id: trip._id,
          type: trip.type,
          phase: trip.phase,
          location: trip.location,
          status: trip.status,
          tripState: trip.tripState,
          purpose: trip.purpose,
          loadStatus: trip.loadStatus,
          reason: trip.reason ?? null,
          isIntraPlant: !!trip.isIntraPlant,
          createdAt: trip.createdAt,
          startedAt: trip.startedAt ?? null,
          completedAt: trip.completedAt ?? null,
          checkedInAt: trip.checkedInAt ?? null,
          vehicle: pickVehicle(trip.vehicleId),
          driver: pickDriver(trip.driverId),
          sourceFactory: pickFactory(trip.sourceFactoryId),
          destinationFactory: pickFactory(trip.destinationFactoryId),
          currentFactory: pickFactory(trip.currentFactoryId),
        }
      : null;

    return res.status(200).json({
      success: true,
      trip: formattedTrip,
      segments: formattedSegments,
      history,
    });
  } catch (err) {
    console.error("Trip finder error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip history",
      error: err.message,
    });
  }
};