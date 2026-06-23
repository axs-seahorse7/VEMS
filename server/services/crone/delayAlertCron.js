import cron from "node-cron";
import Trip from "../../db/models/Vehicle-Model/trip.model.js";
import { AlertEmailUsers } from "../../db/models/Alert-Users/alertEmailUsers.model.js";
import { alertMailSender, ALERT_TYPES } from "../alertMailSender.js";
import mongoose from "mongoose";

const FOUR_HOURS = 4 * 60 * 60 * 1000;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const LEVEL_SUBSCRIPTION_MAP = {
  1: "delay4h",
  2: "delay12h",
  3: "delay24h",
};


function getAlertFactoryId(trip) {
  // ── Case 1: Vehicle checked in at destination ───────────────────
  if (trip.checkedInAt ) {
    return (
      trip.destinationFactoryId?._id?.toString?.() ||
      trip.destinationFactoryId?.toString?.() || trip.currentFactoryId?._id?.toString?.() ||
      null
    );
  }

  // ── Case 2: Vehicle reached destination gate but not checked in ─
  // Waiting outside destination
  if (
    trip.arrivedAt &&
    !trip.checkedInAt &&
    trip.phase === "DESTINATION" &&
    trip.location === "outside_factory"
  ) {
    return (
      trip.destinationFactoryId?._id?.toString?.() ||
      trip.destinationFactoryId?.toString?.() ||
      null
    );
  }
  // ── Case 3: Vehicle is at origin factory ────────────────────────
  if (
    trip.phase === "ORIGIN" &&
    trip.location === "inside_factory" &&
    trip.status !== "ROUTE_CHANGED" &&
    !trip.arrivedAt &&
    !trip.checkedInAt
  ) {
    return (
      trip.sourceFactoryId?._id?.toString?.() ||
      trip.sourceFactoryId?.toString?.() ||
      null
    );
  }

  // ── Fallback ────────────────────────────────────────────────────
  console.warn("Could not determine alert factory for trip:", trip._id);
  return null;
}

function pushToGroup(group, trip) {
  const factoryId = getAlertFactoryId(trip);

  console.log(`Trip ${trip._id} assigned to factory ${factoryId} for alert grouping.`);

  if (!factoryId) {
    console.warn("No destination factory for trip:", trip._id);
    return;
  }

  if (!group[factoryId]) {
    group[factoryId] = [];
  }

  group[factoryId].push(trip);
}


function isStillWaiting(trip) {
  const outsideWaiting =
    trip.location === "outside_factory" &&
    trip.status === "ARRIVED" &&
    !trip.checkedInAt;

  const insideWaiting =
    trip.location === "inside_factory" &&
    trip.checkedInAt &&
    trip.loadStatus === "pending";

   
  return outsideWaiting || insideWaiting;
}

async function sendAlertsForLevel(level, trips) {
  if (!trips.length) return;

  const subscription = LEVEL_SUBSCRIPTION_MAP[level];

  // group trips by factory so we send one mail per factory per recipient
  const byFactory = {};
  for (const trip of trips) {
    pushToGroup(byFactory, trip);
  }

  const factoryIds = Object.keys(byFactory);
  const objectFactoryIds = factoryIds.map(
    id => new mongoose.Types.ObjectId(id)
  );

  const recipients = await AlertEmailUsers.find({
    factoryId: { $in: objectFactoryIds },
    isPaused: false,
    alertSubscriptions: subscription,
  }).populate("factoryId", "name");

  const successfulTripIds = [];

  for (const factoryId of factoryIds) {
    const factoryTrips = byFactory[factoryId];
    const factoryRecipients = recipients.filter((r) => r.factoryId?._id.toString() === factoryId.toString());

    if (!factoryRecipients.length) {
      console.warn(`No recipients found for factoryId: ${factoryId}`);
      continue
    };

    const result = await alertMailSender({
      to: factoryRecipients.map(r => r.email),
      alertType: ALERT_TYPES.TRIP_DELAYED,
      priority: level === 3 ? "high" : "medium",
      payload: {
        level:
          level === 1 ? "4 HOURS" :
          level === 2 ? "12 HOURS" :
          "24+ HOURS",
        factoryName: factoryRecipients[0]?.factoryId?.name || "Unknown Factory",
        trips: factoryTrips
      }
    });

    if (result.success) {
      console.log("sending delay alert email successful for factoryId:", factoryId);
      successfulTripIds.push(...factoryTrips.map(t => t._id));
    }
  }

  if (successfulTripIds.length) {
  await Trip.updateMany(
    { _id: { $in: successfulTripIds } },
    {
      $set: {
        delayAlertLevel: level,
        [`delayAlertMeta.level${level}SentAt`]: new Date()
      }
    }
  );
}
}

let isCronRunning = false;

async function processDelayAlerts() {
    if(isCronRunning) {
      console.log("Cron is already running. Skipping this run.");
      return;
    }

    isCronRunning = true;

  try {
    console.log("Running delay alert cron...");

    const activeTrips = await Trip.find({
      tripState: "ACTIVE",
      waitingSince: { $ne: null },
      delayAlertLevel: { $lt: 3 },
    })
    .populate("vehicleId")
    .populate("driverId")
    .populate("destinationFactoryId")
    .populate("sourceFactoryId")
    .populate("currentFactoryId")

    const groupedAlerts = {
      1: [],
      2: [],
      3: [],
    };

    const now = Date.now();

    for (const trip of activeTrips) {

      const waitingStart = isStillWaiting(trip) ? trip.waitingSince : null;
      if (!waitingStart) continue;

      const delay = now - waitingStart.getTime();
      const level = trip.delayAlertLevel || 0;

      if (delay >= ONE_DAY && level < 3) {
        groupedAlerts[3].push(trip);
      } else if (delay >= TWELVE_HOURS && level < 2) {
        groupedAlerts[2].push(trip);
      } else if (delay >= FOUR_HOURS && level < 1) {
        groupedAlerts[1].push(trip);
      }
    }


    await sendAlertsForLevel(1, groupedAlerts[1]);
    await sendAlertsForLevel(2, groupedAlerts[2]);
    await sendAlertsForLevel(3, groupedAlerts[3]);

    console.log("Delay alert cron completed");
  } catch (err) {
    console.error("Delay cron error:", err);
  } finally {
    isCronRunning = false;
  }
}

export function startDelayCron() {
  processDelayAlerts(); 

  cron.schedule("0 * * * *", async () => {
    await processDelayAlerts();
  });
}