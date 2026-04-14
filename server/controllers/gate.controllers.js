// gate.controller.js
import mongoose from "mongoose";
import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
import VehicleState from "../db/models/Vehicle-Model/vehicleState.model.js";
import Trip from "../db/models/Vehicle-Model/trip.model.js";
import GateLog from "../db/models/Vehicle-Model/gate.model.js";

export const checkoutVehicle = async (req, res) => {
  try {
    const { vehicleNumber, sourceFactoryId, destinationFactoryId, purpose } = req.body;

    const vehicle = await Vehicle.findOne({ vehicleNumber });
    if (!vehicle) throw new Error("Vehicle not found");

    const state = await VehicleState.findOne({ vehicleId: vehicle._id });

    if (!state || state.status !== "inside_factory") {
      throw new Error("Vehicle is not inside factory");
    }

    // Create Trip
    const trip = await Trip.create({
      vehicleId: vehicle._id,
      sourceFactoryId,
      destinationFactoryId,
      purpose,
      status: "in_transit"
    });

    // Gate log
    await GateLog.create({
      vehicleId: vehicle._id,
      factoryId: sourceFactoryId,
      tripId: trip._id,
      action: "checkout"
    });

    // Update state
    await VehicleState.findOneAndUpdate(
      { vehicleId: vehicle._id },
      {
        status: "in_transit",
        currentFactoryId: null,
        currentTripId: trip._id
      }
    );

    return res.json({ success: true, trip });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const checkinVehicle = async (req, res) => {

  try {
    const { vehicleNumber, factoryId } = req.body;

    const vehicle = await Vehicle.findOne({ vehicleNumber });
    if (!vehicle) throw new Error("Vehicle not found");

    const state = await VehicleState.findOne({ vehicleId: vehicle._id });

    if (!state || state.status !== "waiting_outside") {
      throw new Error("Vehicle is not at gate");
    }

    //  Use currentTripId (IMPORTANT FIX)
    const trip = await Trip.findById(state.currentTripId);

    if (!trip || trip.status !== "waiting") {
      throw new Error("Invalid or no active trip");
    }

    if (trip.destinationFactoryId.toString() !== factoryId) {
      throw new Error("Wrong destination");
    }

    //  Prevent duplicate checkin
    const existingLog = await GateLog.findOne({
      vehicleId: vehicle._id,
      tripId: trip._id,
      action: "checkin"
    });

    if (existingLog) {
      throw new Error("Vehicle already checked in");
    }

    // 1. Gate log
    await GateLog.create([{
      vehicleId: vehicle._id,
      factoryId,
      tripId: trip._id,
      action: "checkin"
    }],);

    // 2. Update trip
    trip.status = "arrived";
    await trip.save();

    // 3. Update state
    await VehicleState.findOneAndUpdate(
      { vehicleId: vehicle._id },
      {
        status: "inside_factory",
        currentFactoryId: factoryId
      },
      
    );


    return res.json({ success: true });

  } catch (err) {

    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};

export const getIncomingVehicles = async (req, res) => {
  try {
    const { factoryId } = req.params;

    const trips = await Trip.find({
      destinationFactoryId: factoryId,
      status: "in_transit"
    }).populate("vehicleId");

    return res.json(trips);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getVehicleStatus = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    const vehicle = await Vehicle.findOne({ vehicleNumber });
    if (!vehicle) throw new Error("Vehicle not found");

    const state = await VehicleState.findOne({ vehicleId: vehicle._id })
      .populate("currentFactoryId currentTripId");

    return res.json(state);

  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
};

export const externalEntry = async (req, res) => {
  try {
    const {
      vehicleNumber,
      factoryId,
      transporterName,
      typeOfVehicle,
      PUCExpiry,
      purpose,
      vehicleFor,
      supplier,
      material,
      quantity,
      invoiceNo,
      invoiceAmount,
      customer
    } = req.body;

    // 1. Find or create vehicle
    let vehicle = await Vehicle.findOne({ vehicleNumber });

    if (!vehicle) {
      vehicle = await Vehicle.create({
        vehicleNumber,
        type: "external",
        transporterName,
        typeOfVehicle,
        PUCExpiry
      });
    }

    // 2. Create Trip
    const trip = await Trip.create({
      vehicleId: vehicle._id,
      type: "external_delivery",
      sourceFactoryId: null,
      destinationFactoryId: factoryId,
      purpose,
      loadStatus: "pending",
      vehicleFor,
      supplier,
      material,
      quantity,
      invoiceNo,
      invoiceAmount,
      customer,
      status: "waiting"
    });

    // 3. GateLog (OPTIONAL: mark arrival directly)
    await GateLog.create({
      vehicleId: vehicle._id,
      factoryId,
      tripId: trip._id,
      action: "waiting"
    });

    // 4. Update State → directly inside
    await VehicleState.findOneAndUpdate(
      { vehicleId: vehicle._id },
      {
        status: "waiting_outside",
        currentFactoryId: factoryId,
        currentTripId: trip._id
      },
      { upsert: true }
    );

    // 5. Mark trip arrived
    trip.status = "arrived";
    await trip.save();

    return res.json({ success: true, trip });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { factoryId } = req.params;

    if (!factoryId) {
      return res.status(400).json({ error: "factoryId is required" });
    }

    //  1. WAITING VEHICLES (AT GATE)
    const waitingStates = await VehicleState.find({
      status: "waiting_outside",
      currentFactoryId: factoryId
    })
      .populate("vehicleId currentTripId")
      .lean();

    const waiting = waitingStates.map(v => ({
      vehicle: v.vehicleId,
      trip: v.currentTripId,
      state: v
    }));


    //  2. INSIDE VEHICLES
    const insideStates = await VehicleState.find({
      status: "inside_factory",
      currentFactoryId: factoryId
    })
      .populate("vehicleId currentTripId")
      .lean();

    const inside = insideStates.map(v => ({
      vehicle: v.vehicleId,
      trip: v.currentTripId,
      state: v
    }));


    //  3. INCOMING (ONLY INTERNAL TRANSFERS)
    const incomingTrips = await Trip.find({
      status: "in_transit",
      destinationFactoryId: factoryId,
      sourceFactoryId: { $ne: null } // exclude external
    })
      .populate("vehicleId")
      .lean();

    const incoming = incomingTrips.map(t => ({
      vehicle: t.vehicleId,
      trip: t
    }));


    //  4. OUTGOING VEHICLES
    const outgoingTrips = await Trip.find({
      status: "in_transit",
      sourceFactoryId: factoryId
    })
      .populate("vehicleId")
      .lean();

    const outgoing = outgoingTrips.map(t => ({
      vehicle: t.vehicleId,
      trip: t
    }));


    // ⚡ RESPONSE
    return res.json({
      waiting,   // NEW
      inside,
      incoming,
      outgoing
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ error: err.message });
  }
};