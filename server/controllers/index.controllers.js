import vanModel from "../db/models/van-model/van.model.js";
import userModel from "../db/models/User-Model/user.model.js";
import factoryModel from "../db/models/factory-model/factory.model.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pushTimeline = (trip, event, locationId, note = "", phase = "ORIGIN") => {
  trip.timeline.push({ event, location: locationId, note, phase, timestamp: new Date() });
};

const getUserWithFactory = async (userId) => {
  const user = await userModel.findById(userId).populate("factory", "name location");
  if (!user || !user.factory) throw new Error("User factory missing");
  return user;
};

export const getEntries = async (req, res) => {
  try {
    const user = await getUserWithFactory(req.userId);
    const factoryId = user.factory._id;

    const [vans, upcoming] = await Promise.all([
      // Vans that originated from this factory (active trips)
      vanModel
        .find({ "currentTrip.fromLocation": factoryId })
        .sort({ "currentTrip.arrivalTimeAtFactory": -1 })
        .populate("currentTrip.fromLocation", "name location")
        .populate("currentTrip.toLocation", "name location"),

      // Vans en-route to this factory (from anywhere)
      vanModel
        .find({
          "currentTrip.toLocation": factoryId,
          "currentTrip.status": "enroute",
        })
        .populate("currentTrip.fromLocation", "name location")
        .populate("currentTrip.toLocation", "name location"),
    ]);

    const destination = await vanModel
      .find({
        "currentTrip.toLocation": factoryId,
        "currentTrip.status": "waiting"
      })
      .populate("currentTrip.fromLocation", "name location")
      .populate("currentTrip.toLocation", "name location");

    return res.status(200).json({ vans, upcoming, destination });
  } catch (error) {
    console.error("getEntries error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};


export const upsertEntry = async (req, res) => {
  try {
    const {
      vehicleNumber, driverName, driverContact, driverIdType, driverIdNumber,
      transporterName, vehicleType, PUCEndDate, goodsType, materialType,
      materialQuantity, purpose, toLocation, status = "waiting",
      
    } = req.body;

    if (!vehicleNumber || !driverName) {
      return res.status(400).json({ message: "vehicleNumber and driverName are required" });
    }

    const user = await getUserWithFactory(req.userId);
    const factoryId = user.factory._id;
    const now = new Date();

    // Build the initial trip object
    const isInside = status === "inside";
    const isWaiting = status === "waiting";
    const isEnroute = status === "enroute";

    const tripData = {
      fromLocation: factoryId,
      toLocation: toLocation || null,
      status: isInside ? "inside" : isWaiting ? "waiting" : "enroute",
      route: [{ location: factoryId, timestamp: now }],
      timeline: [],
      arrivalTimeAtFactory: isInside || isWaiting ? now : null,
      entryTimeAtFactory: isInside ? now : null,
      dispatchTimeFromFactory: null,
      tripStage: isInside ? "INSIDE" : "GATE",
    };

    // Seed timeline based on initial status
    pushTimeline(tripData, "CREATED",  factoryId, `Registered by ${user.name || "guard"}`,  "ORIGIN");
    if (isWaiting) pushTimeline(tripData, "GATE_IN", factoryId, "Van arrived at gate, waiting",  "ORIGIN");
    if (isInside) {
      pushTimeline(tripData, "GATE_IN", factoryId, "Van arrived at gate", "ORIGIN");
      pushTimeline(tripData, "CHECK_IN", factoryId, "Direct entry by guard", "ORIGIN");
    }

    // Find or create van
    let van = await vanModel.findOne({ vehicleNumber });

    if (van) {
      // Archive old trip if exists
      if (van.currentTrip && van.currentTrip.fromLocation) {
        van.tripHistory.push(van.currentTrip);
      }
      // Update driver/vehicle fields and open new trip
      Object.assign(van, {
        driverName, driverContact, driverIdType, driverIdNumber,
        transporterName, vehicleType, PUCEndDate,
        goodsType: goodsType || van.goodsType,
        materialType: Array.isArray(materialType) ? materialType : [materialType],
        materialQuantity: Array.isArray(materialQuantity) ? materialQuantity : [materialQuantity],
        purpose,
        currentTrip: tripData,
      });
      await van.save();
      return res.status(200).json({ message: "Van updated with new trip", entry: van, updated: true });
    } else {
      van = new vanModel({
        driverName, driverContact, driverIdType, driverIdNumber,
        vehicleNumber, transporterName, vehicleType, PUCEndDate,
        goodsType, purpose,
        materialType: Array.isArray(materialType) ? materialType : [materialType],
        materialQuantity: Array.isArray(materialQuantity) ? materialQuantity : [Number(materialQuantity)],
        currentTrip: tripData,
        tripHistory: [],
      });
      await van.save();
      return res.status(201).json({ message: "Van created with new trip", entry: van, created: true });
    }
  } catch (error) {
    console.error("upsertEntry error:", error);
   return res.status(500).json({ message: error.message || "Server error" });
  }
};


export const checkIn = async (req, res) => {
  try {
    const van = await vanModel.findById(req.params.id);
    if (!van || !van.currentTrip) return res.status(404).json({ message: "Van not found" });
    
    if (van.currentTrip.tripStage !== "GATE") {
      return res.status(400).json({ message: "Van not at gate" });
    }

    
    van.currentTrip.tripStage = "INSIDE";
    const user = await getUserWithFactory(req.userId);
    const factoryId = user.factory._id;
    const now = new Date();
    
    const isDestination =String(van.currentTrip.toLocation) === String(factoryId);
    const phase = isDestination ? "DESTINATION" : "ORIGIN";
    van.currentTrip.status = "inside";
    van.currentTrip.entryTimeAtFactory = now;
    pushTimeline(van.currentTrip, "CHECK_IN", factoryId, req.body.note || "", phase);    
    van.markModified("currentTrip");

    await van.save();
  return   res.status(200).json({ message: "Van checked in", entry: van });
  } catch (error) {
   return res.status(500).json({ message: error.message });
  }
};

export const loadingStart = async (req, res) => {
  try {
    const van = await vanModel.findById(req.params.id);
    if (!van || !van.currentTrip) return res.status(404).json({ message: "Van not found" });

    if (van.currentTrip.tripStage !== "INSIDE") {
      return res.status(400).json({ message: "Van must be inside first" });
    }
    const user = await getUserWithFactory(req.userId);
    
    
    const isDestination = String(van.currentTrip.toLocation) === String(user.factory._id);
    const phase = isDestination ? "DESTINATION" : "ORIGIN";
    const event = phase === "ORIGIN"? "LOADING_START" : "UNLOADING_START";
    van.currentTrip.tripStage = "LOADING";

    pushTimeline(van.currentTrip, event, user.factory._id, req.body.note || "", phase);
    van.currentTrip.status = "inside"; // still inside, just loading
    van.markModified("currentTrip");

    await van.save();
   return res.status(200).json({ message: `${event} recorded`, entry: van });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const loadingEnd = async (req, res) => {
  try {
    const van = await vanModel.findById(req.params.id);
    if (!van || !van.currentTrip) return res.status(404).json({ message: "Van not found" });

    if (van.currentTrip.tripStage !== "LOADING") {
      return res.status(400).json({ message: "Loading not started" });
    }

    const user = await getUserWithFactory(req.userId);
    van.currentTrip.tripStage = "READY_TO_DISPATCH";


    const isDestination = String(van.currentTrip.toLocation) === String(user.factory._id);
    const phase = isDestination ? "DESTINATION" : "ORIGIN";

    const event = phase === "ORIGIN" ? "LOADING_END" : "UNLOADING_END";

    pushTimeline(van.currentTrip, event, user.factory._id, req.body.note || "", phase);

    await van.save();
   return res.status(200).json({ message: `${event} recorded`, entry: van });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const van = await vanModel.findById(req.params.id);
    if (!van || !van.currentTrip) return res.status(404).json({ message: "Van not found" });

    if (van.currentTrip.tripStage !== "READY_TO_DISPATCH") {
      return res.status(400).json({ message: "Not ready for dispatch" });
    }

    
    van.currentTrip.tripStage = "ENROUTE";
    const user = await getUserWithFactory(req.userId);
    const factoryId = user.factory._id;
    const now = new Date();
    const { nextToLocation, note } = req.body; // optional: for multi-round trips
    
    const isDestination = String(van.currentTrip.toLocation) === String(factoryId);
    const phase = isDestination ? "DESTINATION" : "ORIGIN";

    // Close current trip
    pushTimeline(van.currentTrip, "CHECK_OUT", factoryId, note || "", phase);
    pushTimeline(van.currentTrip, "DISPATCHED", factoryId, "Departed gate", phase);
    van.currentTrip.dispatchTimeFromFactory = now;
    van.currentTrip.status = "enroute";

    // Archive the closed trip
    if (isDestination) {
    // FINAL completion
    van.tripHistory.push({ ...van.currentTrip.toObject() });

    if (nextToLocation) {
      const newTrip = {
        fromLocation: factoryId,
        toLocation: nextToLocation,
        status: "enroute",
        route: [{ location: factoryId, timestamp: now }],
        timeline: [],
        arrivalTimeAtFactory: null,
        entryTimeAtFactory: null,
        dispatchTimeFromFactory: null,
        tripStage: "ENROUTE",
      };

      pushTimeline(newTrip, "CREATED", factoryId, "New round started after checkout");
      van.currentTrip = newTrip;

    } else {
      van.currentTrip = undefined;
    }

  } else {
    // ORIGIN dispatch (normal case)
    if (nextToLocation) {
      const newTrip = {
        fromLocation: factoryId,
        toLocation: nextToLocation,
        status: "enroute",
        route: [{ location: factoryId, timestamp: now }],
        timeline: [],
        arrivalTimeAtFactory: null,
        entryTimeAtFactory: null,
        dispatchTimeFromFactory: null,
        tripStage: "ENROUTE",
      };

      pushTimeline(newTrip, "CREATED", factoryId, "New round started after checkout");
      van.currentTrip = newTrip;
    }
  }

    van.markModified("currentTrip");
    van.markModified("tripHistory");
    await van.save();

   return res.status(200).json({ message: "Van checked out", entry: van });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const markArrived = async (req, res) => {
  try {
    const van = await vanModel.findById(req.params.id);
    if (!van || !van.currentTrip) {
      return res.status(404).json({ message: "Van not found" });
    }

    const user = await getUserWithFactory(req.userId);
    const factoryId = user.factory._id;
    const now = new Date();

    //  SECURITY CHECK
    if (String(van.currentTrip.toLocation) !== String(factoryId)) {
      return res.status(403).json({ message: "Not your destination van" });
    }

    // Transition
    van.currentTrip.status = "waiting";
    van.currentTrip.arrivalTimeAtFactory = now;

    van.currentTrip.route.push({
      location: factoryId,
      timestamp: now,
    });

    pushTimeline(
      van.currentTrip,
      "GATE_IN",
      factoryId,
      req.body.note || "Arrived at destination gate",
      "DESTINATION"
    );

    van.currentTrip.tripStage = "GATE";

    van.markModified("currentTrip");
    await van.save();

    return res.status(200).json({ message: "Van arrived at destination", entry: van });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const getVanByVehicleNumber = async (req, res) => {
  try {
    const van = await vanModel
      .findOne({ vehicleNumber: req.params.vehicleNumber })
      .populate("currentTrip.fromLocation currentTrip.toLocation", "name location");

    if (!van) return res.status(404).json({ exists: false });
    return res.status(200).json({ exists: true, van });
  } catch (error) {
    return  res.status(500).json({ message: "Server error" });
  }
};


export const getVanHistory = async (req, res) => {
  try {
    const van = await vanModel
      .findById(req.params.id)
      .populate("tripHistory.fromLocation tripHistory.toLocation", "name location")
      .populate("currentTrip.fromLocation currentTrip.toLocation", "name location");

    if (!van) return res.status(404).json({ message: "Van not found" });
   return res.status(200).json({ van });
  } catch (error) {
   return res.status(500).json({ message: "Server error" });
  }
};


export const updateEntry = async (req, res) => {
  try {
    const entry = await vanModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    return res.status(200).json({ message: "Entry updated", entry });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const deleteEntry = async (req, res) => {
  try {
    const entry = await vanModel.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    return res.status(200).json({ message: "Entry deleted" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


