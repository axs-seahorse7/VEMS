// utils/vehicleDashboardHelpers.js
import mongoose from "mongoose";

export function resolveDateRange(startDate, endDate) {
  const now = startDate && endDate
    ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
    : new Date();

  const since = startDate && endDate
    ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        return d;
      })();

  return { since, now };
}

export function buildFactoryFilter(factory) {
  if (!factory) return {};
  const fid = new mongoose.Types.ObjectId(factory);
  return {
    $or: [
      { destinationFactoryId: fid },
      { sourceFactoryId: fid },
    ],
  };
}

export function getTripHours(trip) {
  if (trip.startedAt && trip.completedAt) {
    const diffMs = new Date(trip.completedAt) - new Date(trip.startedAt);
    return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
  }
  return 0;
}

export function buildAllDates(since, days) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  }
  return dates;
}

export function daysBetween(since, now) {
  return Math.floor((new Date(now) - new Date(since)) / 86400000) + 1;
}

// Every sub-controller needs the same vehicle existence check + common params
export async function loadVehicleContext(req, res, Vehicle) {
  const { vehicleId, period = "week", vehicleType = "all", startDate, endDate, location, factory } = req.query;
  if (!vehicleId) {
    res.status(400).json({ message: "vehicleId is required" });
    return null;
  }

  const vehicle = await Vehicle.findById(vehicleId).lean();
  if (!vehicle) {
    res.status(404).json({ message: "Vehicle not found" });
    return null;
  }

  const { since, now } = resolveDateRange(startDate, endDate);
  const factoryFilter = buildFactoryFilter(factory);
  const vid = new mongoose.Types.ObjectId(vehicleId);
  const days = daysBetween(since, now);

  return { vehicle, vid, since, now, period, vehicleType, factory, factoryFilter, days };
}