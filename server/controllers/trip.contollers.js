import mongoose from "mongoose";
import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
import VehicleState from "../db/models/Vehicle-Model/vehicleState.model.js";
import Trip from "../db/models/Vehicle-Model/trip.model.js";
import GateLog from "../db/models/Vehicle-Model/gate.model.js";
import User from "../db/models/User-Model/user.model.js";
import Driver from "../db/models/Driver-model/driver.model.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../middleware/Asynct-handler/asyncHandler.js";
import DriverTripHistory from "../db/models/Driver-model/driverStats.model.js";





export const getActiveTrip = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    const vehicle = await Vehicle.findOne({ vehicleNumber });
    if (!vehicle) throw new Error("Vehicle not found");

    const trip = await Trip.findOne({
      vehicleId: vehicle._id,
      status: "in_transit"
    })
    .populate("sourceFactoryId destinationFactoryId");

    return res.json(trip || null);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const getTripHistory = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    const vehicle = await Vehicle.findOne({ vehicleNumber });
    if (!vehicle) throw new Error("Vehicle not found");

    const trips = await Trip.find({
      vehicleId: vehicle._id
    })
    .sort({ createdAt: -1 })
    .populate("sourceFactoryId destinationFactoryId");

    return res.json(trips);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const getFactoryTrips = async (req, res) => {
  try {
    const { factoryId } = req.params;

    const trips = await Trip.find({
      $or: [
        { sourceFactoryId: factoryId },
        { destinationFactoryId: factoryId }
      ]
    })
    .sort({ createdAt: -1 })
    .populate("vehicleId");

    return res.json(trips);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getIncomingTrips = async (req, res) => {
  const { factoryId } = req.params;

  const trips = await Trip.find({
    destinationFactoryId: factoryId,
    status: "in_transit"
  }).populate("vehicleId");

  return res.json(trips);
};

export const createTrip = async (req, res) => {
  try {
    const { vehicleId, type, sourceFactoryId, destinationFactoryId, createdBy } = req.body;

    if (!vehicleId || !type) {
      return res.status(400).json({ message: "vehicleId and type are required." });
    }
    const trip = await Trip.create({
       ...req.body,
       sourceFactoryId: sourceFactoryId || null,
       destinationFactoryId: destinationFactoryId || null,
       createdBy: createdBy || "system"
    });
    return res.json({trip, success: true});
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};



// NEW ENDPOINTS BELOW  
// These endpoints are designed to handle the entire lifecycle of a trip, including both internal transfers and external deliveries. 
// Each endpoint includes proper validation and state management to ensure data integrity and accurate tracking of vehicles, drivers, and trips.

const assignDriverToTrip = async ({
  driverId,
  tripId,
  vehicleId,
  session
}) => {

  // =========================
  // DRIVER UPDATE
  // =========================

  await Driver.findByIdAndUpdate(
    driverId,
    {
      $inc: {
        "stats.totalTrips": 1
      },

      $set: {
        activeTripId: tripId,
        assignedVehicle: vehicleId
      }
    },
    {
      session
    }
  );

  // =========================
  // DRIVER TRIP HISTORY
  // =========================

  await DriverTripHistory.create(
    [{
      driverId,
      tripId,
      startedAt: new Date(),
      completedAt: null
    }],
    {
      session
    }
  );

  // =========================
  // VEHICLE UPDATE
  // =========================

  await Vehicle.findByIdAndUpdate(
    vehicleId,
    {
      driverId
    },
    {
      session
    }
  );

};


export const externalVehicleRegister = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;

  try {
    await session.withTransaction(async () => {
      const {
        vehicleNumber,
        driverIdNumber,
        driverName,
        driverContact,
        driverIdType,
        licenseNumber,
        isInternalShifting,
        typeOfVehicle,
      } = req.body;


      // ========================
      // VALIDATION
      // ========================
      if (!vehicleNumber || !driverIdNumber) {
        throw new AppError( "vehicleNumber and driverIdNumber are required", 400)
      }

      // ========================
      // 1. USER
      // ========================
      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("User not found", 400 );
      }

      // ========================
      // 2. VEHICLE (GET OR CREATE)
      // ========================
      const vehicle = await Vehicle.findOneAndUpdate(
        {
          vehicleNumber
        },
        {
          $setOnInsert: {
            vehicleNumber,
            type: "external",
            ...req.body
          }
        },
        {
          new: true,
          upsert: true,
          session
        }
      );

      // ========================
      // 3. DRIVER (GET OR CREATE)
      // ========================
      const driver = await Driver.findOneAndUpdate(
        {
          $or: [
            { driverIdNumber },
            { licenseNumber }
          ]
        },
        {
          $setOnInsert: {
            driverName,
            driverContact,
            driverIdType,
            driverIdNumber,
            licenseNumber,
            typeOfVehicle
          }
        },
        {
          new: true,
          upsert: true,
          session
        }
      );

      
      // ========================
      // 4. VEHICLE CHECK
      // ========================
      const existingTrip = await Trip.findOne({
        vehicleId: vehicle._id,
        tripState: { $in: ["ACTIVE", "COMPLETED", "PENDING"] }
      }).session(session);

      if (existingTrip) {
        throw new AppError("Vehicle already on a trip", 400);
      }

      // ========================
      // 5. CREATE TRIP
      // ========================
      const tripPayload = {
        vehicleId: vehicle._id,
        driverId: driver._id,
        type: isInternalShifting? "internal_transfer" : "external_delivery",
        phase: isInternalShifting ? "ORIGIN" : "DESTINATION",
        location: isInternalShifting ? "inside_factory" : "outside_factory",
        externalSource: isInternalShifting ? null : req.body.source,
        sourceFactoryId: isInternalShifting ? user.factory._id: null,
        destinationFactoryId: isInternalShifting? req.body.destinationFactoryId: req.body.sourceFactoryId,
        purpose: req.body.purpose || "Delivery",
        reason:null,
        status: isInternalShifting? "ORIGIN" : "ARRIVED",
        loadStatus: "pending",
        startedAt: new Date(),
        materials: [
          {
            name: req.body.materialType,
            material: req.body.material || req.body.materialType,
            quantity: req.body.quantity,
            invoiceNo: req.body.invoiceNo,
            invoiceAmount: req.body.invoiceAmount,
            unit: req.body.unit,
            seal: req.body.seal || "sealed",
            customer: req.body.customer || null,
            supplier: req.body.supplier || null
          }
        ],

        tripHistory: [
          {
            status: isInternalShifting? "ORIGIN": "ARRIVED",
            location: isInternalShifting? "inside_factory": "outside_factory",
            phase: isInternalShifting? "ORIGIN": "DESTINATION",
            factoryId: isInternalShifting? req.body.sourceFactoryId: user.factory._id || null,
            action: "begin",
            timestamp: new Date(),
            segment: {
              movementType: isInternalShifting? "internal": "external",
              externalSource: isInternalShifting? null: req.body.source ?? null,
              sourceFactoryId: isInternalShifting? req.body.sourceFactoryId: null,
              destinationFactoryId: user.factory._id ?? null,
              startedAt: new Date(),
              completedAt: null,
            }
          }
        ]
      };

      let newTrip = await Trip.create(
        [tripPayload],
        { session }
      );

      newTrip = newTrip[0];

      // ========================
      // 6. ASSIGN RELATIONS
      // ========================
      await assignDriverToTrip({
        driverId: driver._id,
        tripId: newTrip._id,
        vehicleId: vehicle._id,
        session
      });

      vehicle.currentTrip = newTrip._id;
      vehicle.currentFactoryId = user.factory._id || null;
      await vehicle.save({ session });

      responseData = {
        success: true,
        trip: newTrip,
        message: `New Trip for ${vehicle.vehicleNumber} has been created.`
      };
    });

  } finally {
   await session.endSession();
  }

 return res.status(201).json(responseData);
});

export const internalVehicleRegister = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;
  try {
    await session.withTransaction(async () => {
      const {
        vehicleNumber,
        driverIdNumber,
        driverName,
        driverContact,
        driverIdType,
        licenseNumber,
        destinationFactoryId,
        purpose
      } = req.body;

      console.log("Internal Vehicle Register Payload:", req.body);
      // ========================
      // 1. VALIDATION
      // ========================
      if (!vehicleNumber || !driverIdNumber) {
        throw new AppError(" vehicleNumber and driverIdNumber are required", 400);
      }

      // ========================
      // 2. USER
      // ========================
      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

      // ========================
      // 3. VEHICLE (UPSERT)
      // ========================
      const vehicle = await Vehicle.findOneAndUpdate(
        {
          vehicleNumber
        },
        {
          $setOnInsert: {
            ...req.body,
            vehicleNumber,
            type: "internal"
          }
        },
        {
          new: true,
          upsert: true,
          session
        }
      );

      // ========================
      // 4. DRIVER (UPSERT)
      // ========================
      const driver = await Driver.findOneAndUpdate(
        {
          $or: [
            { driverIdNumber },
            { licenseNumber }
          ]
        },
        {
          $setOnInsert: {
            driverName,
            driverContact,
            driverIdType,
            driverIdNumber,
            licenseNumber
          }
        },
        {
          new: true,
          upsert: true,
          session
        }
      );

      // ========================
      // 5. VEHICLE CHECK
      // ========================
      const existingTrip = await Trip.findOne({
        vehicleId: vehicle._id,
        tripState: {
          $in: ["ACTIVE", "PENDING"]
        }
      }).session(session);

      if (existingTrip) {
        throw new AppError("Vehicle already on a trip", 400);
      }

      // ========================
      // 6. CREATE TRIP
      // ========================
      const tripPayload = {
        vehicleId: vehicle._id,
        driverId: driver._id,
        type: "internal_transfer",
        phase: "ORIGIN",
        location: "inside_factory",
        sourceFactoryId: user.factory?._id || null,
        destinationFactoryId: destinationFactoryId || null,
        purpose: purpose || "Delivery",
        reason:null,
        status: "ORIGIN",
        loadStatus: "pending",
        startedAt: new Date(),
        completedAt: null,
        materials: [
          {
            name: req.body.materialType,
            material: req.body.material || req.body.materialType,
            quantity: req.body.quantity,
            invoiceNo: req.body.invoiceNo,
            unit: req.body.unit,
            invoiceAmount: req.body.invoiceAmount,
            seal: req.body.seal || "sealed",
            customer: req.body.customer,
            supplier: req.body.supplier || null
          }
        ],

        tripHistory: [
          {
            status: "ORIGIN",
            phase: "ORIGIN",
            factoryId: user.factory?._id || null,
            location: "inside_factory",
            action: "begin",
            timestamp: new Date(),
            segment: {
              movementType: "internal",
              sourceFactoryId: user.factory?._id || null,
              destinationFactoryId: destinationFactoryId || null,
              startedAt: new Date(),
              completedAt: null
            }
          }
        ]
      };

      let newTrip = await Trip.create(
        [tripPayload],
        { session }
      );

      newTrip = newTrip[0];

      await assignDriverToTrip({
        driverId: driver._id,
        tripId: newTrip._id,
        vehicleId: vehicle._id,
        session
      });

      vehicle.currentTrip = newTrip._id;
      vehicle.currentFactoryId = newTrip.sourceFactoryId || null;

      await vehicle.save({ session });

      responseData = {
        success: true,
        trip: newTrip
      };

    });

    
  }  finally {
   await session.endSession();
  }

  return res.status(201).json(responseData);
});

export const checkinVehicle = asyncHandler( async (req, res) => {

  const session = await mongoose.startSession();
  let responseData = null;
  try {

    let updatedTrip = null;

    await session.withTransaction(async () => {

      const { tripId } = req.params;

      // ========================
      // FETCH TRIP
      // ========================
      const trip = await Trip.findById(tripId)
        .session(session);

      if (!trip) {
        throw new AppError("Trip not found", 404);
       
      }

      if (trip.status !== "ARRIVED") {
        throw new AppError("Vehicle must be ARRIVED before check-in", 400);
      }

      if (trip.location === "inside_factory") {
        throw new AppError("Vehicle already checked in", 400);
      }
      

      // ========================
      // UPDATE TRIP
      // ========================
      updatedTrip =
        await Trip.findByIdAndUpdate(
          tripId,
          {
            location: "inside_factory",
            completedAt: new Date(),
            tripState: "ACTIVE",
            $push: {
              tripHistory: {
                status: trip.status,
                location: "inside_factory",
                phase: "DESTINATION",
                factoryId: trip.destinationFactoryId || null,
                action: "checkin",
                timestamp: new Date(),
                segment: {
                  movementType: trip.type === "internal_transfer" ? "internal" : "external",
                  externalSource: trip.externalSource,
                  externalDestination: trip.externalDestination,
                  sourceFactoryId: trip.sourceFactoryId,
                  destinationFactoryId: trip.destinationFactoryId,
                  startedAt: trip.startedAt,
                  completedAt:
                    new Date()
                }
              }
            }
          },
          {
            new: true,
            session
          }
        );

      // ========================
      // UPDATE VEHICLE
      // ========================
      await Vehicle.findByIdAndUpdate(
        trip.vehicleId,
        {
          currentFactoryId:
            trip.destinationFactoryId || null,

          currentTrip: null
        },
        {
          session
        }
      );

    });

    // ========================
    // SUCCESS RESPONSE
    // ========================
   responseData = {
      success: true,
      message:"Vehicle checked in successfully",
      trip: updatedTrip
    };

  }finally {
    session.endSession();
  }

  return res.status(200).json(responseData);
});

export const unloadTrip = async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;
  try {

    let updatedTrip = null;

    await session.withTransaction(async () => {

      const { tripId } = req.params;

      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

      // ========================
      // FETCH TRIP
      // ========================
      const trip = await Trip.findById(tripId)
        .session(session);

      if (!trip) {
        throw new AppError("Trip not found", 404);
      }

      // ========================
      // GUARD CONDITIONS
      // ========================
      if (trip.status !== "ARRIVED") {
        throw new AppError("Trip must be ARRIVED before unloading", 400);
      }

      if (trip.location !== "inside_factory") {
        throw new AppError("Vehicle must be inside factory before unloading", 400);
      }

      if (trip.loadStatus === "unloaded") {
        throw new AppError("Trip already unloaded", 400);
      }

      // ========================
      // UPDATE TRIP
      // ========================
      updatedTrip =
        await Trip.findByIdAndUpdate(
          tripId,
          {
            loadStatus: "unloaded",
            completedAt: new Date(),
            $push: {
              tripHistory: {
                status: trip.status,
                location: trip.location,
                phase: "DESTINATION",
                factoryId:
                  trip.destinationFactoryId ||
                  user.factory._id ||
                  null,

                action: "unload",
                timestamp: new Date(),
                segment: {
                  movementType:
                    trip.type ===
                    "internal_transfer"
                      ? "internal"
                      : "external",

                  externalSource:
                    trip.externalSource,

                  externalDestination:
                    trip.externalDestination,

                  sourceFactoryId:
                    trip.sourceFactoryId,

                  destinationFactoryId:
                    trip.destinationFactoryId,

                  startedAt:
                    trip.startedAt,

                  completedAt:
                    new Date()
                }
              }
            }
          },
          {
            new: true,
            session
          }
        );

    });

    responseData = {
      success: true,
      trip: updatedTrip,
      message:
        "Vehicle unloaded successfully"
    };

  }finally {
    session.endSession();
  }

 return  res.status(200).json(responseData);
};

export const completeTrip = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let updatedTrip = null;
    await session.withTransaction(async () => {
      const { tripId } = req.params;

      // ========================
      // FETCH TRIP
      // ========================
      const trip = await Trip.findById(tripId)
        .session(session);

      if (!trip) {
        throw new AppError("Trip not found", 404);
      }

      // ========================
      // GUARD CONDITIONS
      // ========================
      if (trip.loadStatus === "pending") {
        throw new AppError(
          `Trip cannot complete before "${ trip.purpose === "Pickup"? "Load" : "Unload"} ". Current load status: ${ trip.loadStatus}` ,
        );
      }

      if (trip.location !== "inside_factory") {
        throw new AppError("Vehicle must be inside factory to complete trip", 400);
      }
        
      if (
        trip.tripState === "COMPLETED"
      ) {
        throw new AppError("Trip already completed", 400);
      }

      // ========================
      // UPDATE TRIP
      // ========================
      updatedTrip =
        await Trip.findByIdAndUpdate(
          tripId,
          {
            tripState: "COMPLETED",
            completedAt: new Date(),
            $push: {
              tripHistory: {
                status: trip.status,
                location: trip.location,
                phase: "DESTINATION",
                factoryId:trip.destinationFactoryId || null,
                action: "complete",
                timestamp: new Date(),
                segment: {
                  movementType:trip.type ==="internal_transfer"? "internal": "external",
                  externalSource:trip.externalSource,
                  externalDestination:trip.externalDestination,
                  sourceFactoryId:trip.sourceFactoryId,
                  destinationFactoryId:trip.destinationFactoryId,
                  startedAt:trip.startedAt,
                  completedAt:new Date()
                }
              }
            }
          },
          {
            new: true,
            session
          }
        );

      // ========================
      // RELEASE VEHICLE
      // ========================
      await Vehicle.findByIdAndUpdate(
        trip.vehicleId,
        {
          currentTrip: null
        },
        {
          session
        }
      );

    });

    return res.status(200).json({
      success: true,
      trip: updatedTrip,
      message:"Trip completed successfully"
    });

  } catch (err) {
    console.error("Error in completeTrip:", err);
    return res.status(400).json({
      success: false,
      error: err.message
    });

  } finally {

    session.endSession();

  }
});

export const checkoutVehicle = asyncHandler( async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    // ========================
    // VALIDATION
    // ========================
    if (trip.tripState === "CLOSED") {
      throw new AppError("Trip already closed", 400);
    }

    if (trip.location !== "inside_factory") {
      throw new AppError("Vehicle must be inside factory to checkout", 400);
    }

    // ========================
    // UPDATE TRIP
    // ========================
    const updatedTrip =
      await Trip.findByIdAndUpdate(
        tripId,
        {
          location: "enroute",
          status: "IN_TRANSIT",
          $push: {
            tripHistory: {
              status: "IN_TRANSIT",
              location: "enroute",
              factoryId:trip.sourceFactoryId || null,
              phase: "DESTINATION",
              action: "checkout",
              timestamp: new Date(),
              segment: {
                movementType:
                  trip.type ===
                  "internal_transfer"
                    ? "internal"
                    : "external",

                externalSource:trip.externalSource,
                externalDestination:trip.externalDestination,
                sourceFactoryId:trip.sourceFactoryId,
                destinationFactoryId:trip.destinationFactoryId,
                startedAt:trip.startedAt
              }
            }
          }
        },
        {
          new: true
        }
      );

    // ========================
    // RESPONSE
    // ========================
    return res.status(200).json({
      success: true,
      trip: updatedTrip,
      message:"Vehicle checked out successfully"
    });

  } catch (err) {

    console.error(
      "Error in checkoutVehicle:",
      err
    );

    return res.status(400).json({
      success: false,
      error: err.message
    });

  }
});

export const checkoutAndExitVehicle = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let updatedTrip = null;
    await session.withTransaction(async () => {

      const { tripId } = req.params;

      // ========================
      // FETCH TRIP
      // ========================
      const trip = await Trip.findById(tripId)
        .session(session);

      if (!trip) {
        throw new AppError("Trip not found", 404);
      }

      // ========================
      // VALIDATION
      // ========================
      if (trip.tripState === "CLOSED") {
        throw new AppError("Trip already closed", 400);
      }

      if (trip.location !== "inside_factory") {
        throw new AppError("Vehicle must be inside factory to checkout", 400);
      }

      const now = new Date();

      // ========================
      // CLOSE TRIP
      // ========================
      updatedTrip =
        await Trip.findByIdAndUpdate(
          tripId,
          {
            location: "outside_factory",
            status: "DESTINATION",
            tripState: "CLOSED",
            completedAt: now,
            $push: {
              tripHistory: {
                status: "DESTINATION",
                location: "outside_factory",
                factoryId:trip.destinationFactoryId || null,
                phase: "DESTINATION",
                action: "closed",
                timestamp: now,
                segment: {
                  movementType:
                    trip.type ===
                    "internal_transfer"
                      ? "internal"
                      : "external",

                  externalSource: null,
                  externalDestination:trip.externalDestination ?? null,
                  sourceFactoryId:trip.sourceFactoryId ?? null,
                  destinationFactoryId:
                    trip.type ===
                    "internal_transfer"
                      ? trip.destinationFactoryId
                      : null,

                  startedAt:trip.startedAt,
                  completedAt: now,
                }
              }
            }
          },
          {
            new: true,
            session
          }
        );

      // ========================
      // RELEASE DRIVER
      // ========================
      if (trip.driverId) {

        const duration =
          updatedTrip.completedAt &&
          updatedTrip.startedAt
            ? Math.floor(
                (
                  updatedTrip.completedAt -
                  updatedTrip.startedAt
                ) / 1000
              )
            : 0;

        await Driver.findByIdAndUpdate(
          trip.driverId,
          {
            $inc: {
              "stats.totalTime":
                duration
            },

            $set: {
              activeTripId: null,

              assignedVehicle: null
            }
          },
          {
            session
          }
        );
      }

      // ========================
      // RELEASE VEHICLE
      // ========================
      if (trip.vehicleId) {

        await Vehicle.findByIdAndUpdate(
          trip.vehicleId,
          {
            driverId: null,
            currentTrip: null
          },
          {
            session
          }
        );
      }

    });

    // ========================
    // RESPONSE
    // ========================
    return res.status(200).json({
      success: true,

      trip: updatedTrip,

      message:
        "Vehicle checked out and trip closed successfully"
    });

  } catch (err) {

    console.error(
      "Error in checkoutAndExitVehicle:",
      err
    );

    return res.status(500).json({
      success: false,
      error: err.message
    });

  } finally {

    session.endSession();

  }
});

export const markArrived = asyncHandler( async (req, res) => {
  try { 
    const { tripId } = req.params;

    // ========================
    // FETCH TRIP
    // ========================
    const trip = await Trip.findById(tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    // ========================
    // VALIDATION
    // ========================
    if (trip.tripState === "CLOSED") {
      throw new AppError("Trip already closed", 400);
    }

    if (trip.location !== "enroute") {
      throw new AppError("Vehicle must be enroute to mark arrived", 400);
    }

    // ========================
    // UPDATE TRIP
    // ========================
    const updatedTrip =
      await Trip.findByIdAndUpdate(
        tripId,
        {
          location: "outside_factory",

          status: "ARRIVED",

          phase: "DESTINATION",

          $push: {
            tripHistory: {
              status: "ARRIVED",

              location: "outside_factory",

              factoryId:
                trip.destinationFactoryId || null,

              phase: "DESTINATION",

              action: "arrive",

              timestamp: new Date(),

              segment: {
                movementType:
                  trip.type ===
                  "internal_transfer"
                    ? "internal"
                    : "external",

                externalSource:
                  trip.externalSource,

                externalDestination:
                  trip.externalDestination,

                sourceFactoryId:
                  trip.sourceFactoryId,

                destinationFactoryId:
                  trip.destinationFactoryId,

                startedAt:
                  trip.startedAt
              }
            }
          }
        },
        {
          new: true
        }
      );

    // ========================
    // RESPONSE
    // ========================
    return res.status(200).json({
      success: true,

      trip: updatedTrip,

      message:
        "Vehicle marked as arrived successfully"
    });

  } catch (err) {

    console.error(
      "Error in markArrived:",
      err
    );

    return res.status(400).json({
      success: false,
      error: err.message
    });

  }
});

export const markInternalTransferComplete = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let updatedTrip = null;
    await session.withTransaction(async () => {
      const { tripId } = req.params;
      const trip = await Trip.findById(tripId)
        .session(session);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found."
        });
      }

      // ========================
      // VALIDATION
      // ========================
      if (trip.tripState === "CLOSED") {
        throw new AppError("Trip already closed", 400);
      }

      if (trip.tripState === "CANCELLED") {
        throw new AppError("Cancelled trip cannot be completed", 400);
      }

      if (trip.location !== "inside_factory") {
        throw new AppError("Vehicle must be inside factory to complete trip", 400);
      }

      const now = new Date();

      // ========================
      // CLOSE TRIP
      // ========================
      updatedTrip =
        await Trip.findByIdAndUpdate(
          tripId,
          {
            tripState: "CLOSED",

            status: "DESTINATION",

            completedAt: now,

            $push: {
              tripHistory: {
                status: "DESTINATION",

                location: trip.location,

                phase: "DESTINATION",

                factoryId:
                  trip.destinationFactoryId || null,

                action: "closed",

                timestamp: now,

                segment: {
                  movementType: "internal",

                  externalSource:
                    trip.externalSource,

                  externalDestination:
                    trip.externalDestination,

                  sourceFactoryId:
                    trip.sourceFactoryId,

                  destinationFactoryId:
                    trip.destinationFactoryId,

                  startedAt:
                    trip.startedAt,

                  completedAt: now
                }
              }
            }
          },
          {
            new: true,
            session
          }
        );

      // ========================
      // RELEASE DRIVER
      // ========================
      if (trip.driverId) {

        const duration =
          updatedTrip.completedAt &&
          updatedTrip.startedAt
            ? Math.floor(
                (
                  updatedTrip.completedAt -
                  updatedTrip.startedAt
                ) / 1000
              )
            : 0;

        await Driver.findByIdAndUpdate(
          trip.driverId,
          {
            $inc: {
              "stats.totalTime":
                duration
            },

            $set: {
              activeTripId: null,

              assignedVehicle: null
            }
          },
          {
            session
          }
        );
      }

      // ========================
      // RELEASE VEHICLE
      // ========================
      if (trip.vehicleId) {

        await Vehicle.findByIdAndUpdate(
          trip.vehicleId,
          {
            driverId: null,

            currentTrip: null
          },
          {
            session
          }
        );
      }

    });

    // ========================
    // RESPONSE
    // ========================
    return res.status(200).json({
      success: true,
      trip: updatedTrip,
      message: "Trip marked as closed successfully"
    });

  } catch (err) {
    console.error("Error in markInternalTransferComplete:", err);
    throw new AppError(err.message, 500);

  } finally {

    session.endSession();

  }
});

export const markLoadCompleteAtDestination = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { tripId } = req.params;
      const { tripDetails } = req.body;

      if (
        !tripDetails ||
        !tripDetails.material ||
        !tripDetails.quantity ||
        !tripDetails.invoiceNo ||
        !tripDetails.invoiceAmount
      ) {
        throw new AppError("All trip detail fields are required", 400);
      }

      const existingTrip = await Trip.findById(tripId).session(session);

      if (!existingTrip) {
        throw new AppError("Trip not found", 404);
      }

      if (
        existingTrip.location !== "inside_factory"
      ) {
        throw new AppError("Vehicle must be inside factory to mark load complete", 400);
      }

      const currentTrip = await Trip.findById(tripId).session(session);
      const updatedTrip = await Trip.findOneAndUpdate(
          {
            _id: tripId,
            loadStatus: {
              $ne: "loaded"
            }
          },

          {
            $set: {
              loadStatus: "loaded",
              materials: [
                {
                  name: tripDetails.material,
                  material: tripDetails.material,
                  quantity: tripDetails.quantity,
                  invoiceNo: tripDetails.invoiceNo,
                  invoiceAmount: tripDetails.invoiceAmount,
                  customer: tripDetails.customer,
                  supplier: tripDetails.supplier || null,
                  seal: tripDetails.seal || null
                }
              ]
            },

            $push: {
              tripHistory: {
                status: existingTrip.status,
                location: existingTrip.location,
                phase: "DESTINATION",
                factoryId: existingTrip.destinationFactoryId || null,
                action: "load",
                timestamp: new Date(),
                details: {
                  material: tripDetails.material,
                  quantity: tripDetails.quantity,
                  invoiceNo: tripDetails.invoiceNo,
                  invoiceAmount: tripDetails.invoiceAmount,
                  customer: tripDetails.customer,
                },

                segment: {
                  movementType: existingTrip.type === "internal_transfer" ? "internal": "external",
                  externalSource: existingTrip.externalSource,
                  externalDestination: existingTrip.externalDestination,
                  sourceFactoryId: existingTrip.sourceFactoryId,
                  destinationFactoryId: existingTrip.destinationFactoryId,
                  startedAt: existingTrip.startedAt
                }
              }
            }
          },

          {
            new: true,
            session
          }
        );

      // ========================
      // CONCURRENCY FAILURE
      // ========================

      if (!updatedTrip) {
        return res.status(400).json({
          success: false,
          message: "Trip already marked as loaded"
        });
      }

      // ========================
      // RESPONSE
      // ========================

      return res.status(200).json({
        success: true,
        trip: updatedTrip,
        message: "Trip load marked as complete successfully"
      });

    });

  } catch (err) {
    console.error("Error in markLoadCompleteAtDestination:", err);
    throw new AppError(err.message, 400);
  } finally {
    session.endSession();
  }
});

export const cancelTrip = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;
  try {

    let updatedTrip = null;
    await session.withTransaction(async () => {
      const { tripId } = req.params;
      const {reason} = req.body;
      const user = await User.findById(req.userId)
        .session(session);

      const trip = await Trip.findById(tripId)
        .session(session);

      if (!trip) {
        throw new AppError("Trip not found", 400);
      }

      // ========================
      // VALIDATION
      // ========================
      if (
        ["COMPLETED", "CLOSED", "CANCELLED"]
          .includes(trip.tripState)
      ) {
        throw new AppError(`Cannot cancel trip with state "${trip.tripState}"`);
      }

      const now = new Date();

      // ========================
      // CANCEL TRIP
      // ========================
      updatedTrip =
        await Trip.findByIdAndUpdate(
          tripId,
          {
            tripState: "CANCELLED",
            reason,
            completedAt: now,
            $push: {
              tripHistory: {
                status: "CANCELLED",
                location: trip.location,
                phase: trip.phase,
                factoryId: user?.factory || null,
                action: "cancelled",
                timestamp: now,
                segment: {
                  movementType:trip.type === "internal_transfer"? "internal" : "external",
                  externalSource: trip.externalSource,
                  externalDestination: trip.externalDestination,
                  sourceFactoryId: trip.sourceFactoryId,
                  destinationFactoryId: trip.destinationFactoryId,
                  startedAt: trip.startedAt,
                  completedAt: now
                }
              }
            }
          },
          {
            new: true,
            session
          }
        );

      // ========================
      // RELEASE DRIVER
      // ========================
      if (trip.driverId) {

        await Driver.findByIdAndUpdate(
          trip.driverId,
          {
            $set: {
              activeTripId: null,

              assignedVehicle: null
            }
          },
          {
            session
          }
        );
      }

      // ========================
      // RELEASE VEHICLE
      // ========================
      if (trip.vehicleId) {

        await Vehicle.findByIdAndUpdate(
          trip.vehicleId,
          {
            driverId: null,
            currentTrip: null
          },
          {
            session
          }
        );
      }

    });

    // ========================
    // RESPONSE
    // ========================
    responseData = {
      success: true,
      trip: updatedTrip,
      message:"Trip cancelled successfully"
    };

  } finally {
   await session.endSession();
  }

 return res.status(201).json(responseData)
});


export const changeRoute = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  let tripDetails = null;
  try {
    let updatedTrip = null;
    await session.withTransaction(async () => {
      const { tripId } = req.params;
      const {
        newDestinationFactoryId,
        customer,
        type
      } = req.body;

      // ========================
      // USER
      // ========================
      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user?.factory) {
        throw new AppError(
          "User or factory not found"
        );
      }

      // ========================
      // TRIP
      // ========================
      const trip = await Trip.findById(tripId)
        .session(session);

      if (!trip) {
        throw new AppError("Trip not found.");
      }

      // ========================
      // VALIDATION
      // ========================
      if (
        ["CLOSED", "CANCELLED"]
          .includes(trip.tripState)
      ) {
        throw new AppError(
          "Cannot change route of a closed or cancelled trip"
        );
      }

      if (
        type === "internal" &&
        !newDestinationFactoryId
      ) {
        throw new AppError(
          "New destination factory is required for internal transfer"
        );
      }

      if (
        type === "external" &&
        !customer
      ) {
        throw new AppError(
          "Customer is required for external movement"
        );
      }

      // ========================
      // SAME DESTINATION CHECK
      // ========================
      if (
        type === "internal" &&
        String(trip.destinationFactoryId) ===
        String(newDestinationFactoryId)
      ) {
        throw new AppError(
          "Vehicle is already at this factory."
        );
      }

      const now = new Date();

      // ========================
      // UPDATE PAYLOAD
      // ========================
      const updatePayload = {
        type:type === "external"? "external_delivery": "internal_transfer",
        purpose: trip.loadStatus === "loaded" && trip.purpose === "Pickup" ? "Delivery" : trip.purpose,
        externalDestination:type === "external"? customer: null,
        sourceFactoryId:user.factory._id,
        destinationFactoryId:type === "internal"? newDestinationFactoryId: null,
        phase: "ORIGIN",
        status: "ORIGIN",
        startedAt: now
      };

      // ========================
      // HISTORY SEGMENT
      // ========================
      const segmentData = {
        movementType: type,
        externalDestination:
          type === "internal"
            ? null
            : customer,

        sourceFactoryId:
          trip.destinationFactoryId,

        destinationFactoryId:
          type === "internal"
            ? newDestinationFactoryId
            : null,

        startedAt:
          trip.startedAt,

        completedAt: now
      };

      // ========================
      // UPDATE TRIP
      // ========================
      updatedTrip =
        await Trip.findByIdAndUpdate(
          tripId,
          {
            ...updatePayload,
            $push: {
              tripHistory: {
                status: "ROUTE_CHANGED",
                phase: "ROUTE_UPDATE",
                location: trip.location || null,
                factoryId: user.factory._id,
                action: "route_change",
                timestamp: now,
                segment: segmentData
              }
            }
          },
          {
            new: true,
            session
          }
        );

    });

    tripDetails = {
      trip: updatedTrip,
      success: true,
      message: "Route Changed Successfully."
    }
    
  } finally {
    session.endSession();
    
  }
  return res.status(200).json(tripDetails);

});


// This endpoint is designed to fetch all relevant trips for a factory, including:
export const getVehicleTrips = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("factory");
    if (!user) throw new Error("User not found");

    const factoryId = user.factory._id;

    const now = new Date();
    const last36Hours = new Date(now.getTime() - 36 * 60 * 60 * 1000);

    const matchStage = {
      $and: [
        {
          $or: [
            { destinationFactoryId: factoryId },
            { sourceFactoryId: factoryId }
          ]
        },
        {
          $or: [
            { tripState: { $nin: ["CLOSED", "CANCELLED"] } },
            {
              tripState: { $in: ["CLOSED", "CANCELLED"] },
              createdAt: { $gte: last36Hours }
            }
          ]
        }
      ]
    };


    const trips = await Trip.aggregate([
      { $match: matchStage },

      //  Vehicle
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "_id",
          as: "vehicle"
        }
      },
      { $unwind: "$vehicle" },

      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "_id",
          as: "driver"
        }
      },
      {
        $unwind: {
          path: "$driver",
          preserveNullAndEmptyArrays: true
        }
      },

      //  Restriction
      {
        $match: {
          $or: [
            { type: "internal_transfer" },
            { type: "external_delivery", "vehicle.status": { $ne: "checkout" } }
          ]
        }
      },

      //  Source Factory
      {
        $lookup: {
          from: "factories",
          localField: "sourceFactoryId",
          foreignField: "_id",
          as: "sourceFactory"
        }
      },
      {
        $unwind: {
          path: "$sourceFactory",
          preserveNullAndEmptyArrays: true
        }
      },

      //  Destination Factory
      {
        $lookup: {
          from: "factories",
          localField: "destinationFactoryId",
          foreignField: "_id",
          as: "destinationFactory"
        }
      },
      {
        $unwind: {
          path: "$destinationFactory",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "factories",
          localField: "tripHistory.factoryId",
          foreignField: "_id",
          as: "tripHistoryFactories"
        }
      },
      {
        $lookup: {
          from: "factories",
          localField: "tripHistory.segment.sourceFactoryId",
          foreignField: "_id",
          as: "segmentSourceFactories"
        }
      },
      {
        $lookup: {
          from: "factories",
          localField: "tripHistory.segment.destinationFactoryId",
          foreignField: "_id",
          as: "segmentDestinationFactories"
        }
      },

      {
        $addFields: {
          tripHistory: {
            $map: {
              input: "$tripHistory",
              as: "history",
              in: {
                $mergeObjects: [
                  "$$history",
                  {
                    factory: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$tripHistoryFactories",
                            as: "f",
                            cond: { $eq: ["$$f._id", "$$history.factoryId"] }
                          }
                        },
                        0
                      ]
                    },

                    segment: {
                      $cond: [
                        { $ifNull: ["$$history.segment", false] },
                        {
                          $mergeObjects: [
                            "$$history.segment",
                            {
                              sourceFactory: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$segmentSourceFactories",
                                      as: "sf",
                                      cond: {
                                        $eq: [
                                          "$$sf._id",
                                          "$$history.segment.sourceFactoryId"
                                        ]
                                      }
                                    }
                                  },
                                  0
                                ]
                              },
                              destinationFactory: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$segmentDestinationFactories",
                                      as: "df",
                                      cond: {
                                        $eq: [
                                          "$$df._id",
                                          "$$history.segment.destinationFactoryId"
                                        ]
                                      }
                                    }
                                  },
                                  0
                                ]
                              }
                            }
                          ]
                        },
                        "$$history.segment"
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },

      //  Optional: clean output
      {
        $project: {
          vehicle: 1,
          driver: 1,
          type: 1,
          phase: 1,
          location: 1,
          status: 1,
          purpose: 1,
          reason: 1,
          tripState: 1,
          loadStatus: 1,
          externalSource: 1,
          sourceFactory: 1,
          externalDestination: 1,
          tripHistory: 1,
          materials: 1,
          destinationFactory: 1,
          createdAt: 1,
          completedAt:1
        }
      },

      { $sort: { createdAt: -1 } }
    ]);

   return res.json(trips);

  } catch (err) {
    console.error("Error fetching vehicle trips:", err);
    return res.status(400).json({ error: err.message });
  }
};

export const getClosedTrips = async (req, res) => {
  try {
    const { vehicleNumber, driverContact, from, to } = req.query;

    const user = await User.findById(req.userId).select("factory");
    if (!user || !user.factory) {
      return res.status(404).json({ message: "User or factory not found" });
    }

    const factoryId = user.factory;

    /* ── Date range ─────────────────────────────────────────── */
    let fromDate, toDate;

    if (from || to) {
      fromDate = from ? new Date(from) : null;
      toDate   = to   ? new Date(to)   : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);
    } else {
      // Default: last 36 hours
      toDate   = new Date();
      fromDate = new Date(toDate.getTime() - 36 * 60 * 60 * 1000);
    }

    const dateFilter = {};
    if (fromDate) dateFilter.$gte = fromDate;
    if (toDate)   dateFilter.$lte = toDate;

    /* ── Pipeline ───────────────────────────────────────────── */
    const pipeline = [
      {
        $match: {
          tripState: "CLOSED",
          ...(Object.keys(dateFilter).length && { updatedAt: dateFilter }),
          $or: [
            { sourceFactoryId: factoryId },
            { destinationFactoryId: factoryId },
          ],
        },
      },

      //  Join vehicle — pull all fields needed for Excel
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: false } },

      //  Join driver — pull full identity fields
      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "_id",
          as: "driver",
        },
      },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },

      //  Dynamic search filters
      {
        $match: {
          ...(vehicleNumber && {
            "vehicle.vehicleNumber": { $regex: vehicleNumber, $options: "i" },
          }),
          ...(driverContact && {
            "driver.driverContact": { $regex: driverContact, $options: "i" },
          }),
        },
      },

      //  Join source factory
      {
        $lookup: {
          from: "factories",
          localField: "sourceFactoryId",
          foreignField: "_id",
          as: "sourceFactory",
        },
      },
      { $unwind: { path: "$sourceFactory", preserveNullAndEmptyArrays: true } },

      //  Join destination factory
      {
        $lookup: {
          from: "factories",
          localField: "destinationFactoryId",
          foreignField: "_id",
          as: "destinationFactory",
        },
      },
      { $unwind: { path: "$destinationFactory", preserveNullAndEmptyArrays: true } },

      //  Project only fields we need — keeps payload lean
      {
        $project: {
          // Trip meta
          _id: 1,
          type: 1,
          tripState: 1,
          startedAt: 1,
          updatedAt: 1,      // used as "Closed At"
          materials: 1,      // embedded array — already on the Trip doc

          // Vehicle fields
          "vehicle._id": 1,
          "vehicle.vehicleNumber": 1,
          "vehicle.type": 1,
          "vehicle.typeOfVehicle": 1,
          "vehicle.PUCExpiry": 1,

          // Driver fields (note: schema uses driverName / driverContact, not name/contact)
          "driver._id": 1,
          "driver.driverName": 1,
          "driver.driverContact": 1,
          "driver.driverIdType": 1,
          "driver.driverIdNumber": 1,
          "driver.licenseNumber": 1,

          // Factories
          "sourceFactory.name": 1,
          "sourceFactory.location": 1,
          "destinationFactory.name": 1,
          "destinationFactory.location": 1,
        },
      },

      { $sort: { updatedAt: -1 } },

      // ── Stats group ──────────────────────────────────────────
      {
        $group: {
          _id: null,
          trips: { $push: "$$ROOT" },
          uniqueVehicles:    { $addToSet: "$vehicle._id" },
          uniqueDrivers:     { $addToSet: "$driver._id" },
          vehicleTripCounts: { $push: { vehicleNumber: "$vehicle.vehicleNumber", vehicleId: "$vehicle._id" } },
          driverTripCounts:  { $push: { driverContact: "$driver.driverContact", driverName: "$driver.driverName", driverId: "$driver._id" } },
        },
      },
      {
        $addFields: {
          totalTrips:         { $size: "$trips" },
          uniqueVehicleCount: { $size: "$uniqueVehicles" },
          uniqueDriverCount:  { $size: "$uniqueDrivers" },
        },
      },
    ];

    const [result] = await Trip.aggregate(pipeline);

    const emptyResponse = {
      success: true,
      count: 0,
      data: [],
      stats: { totalTrips: 0, uniqueVehicleCount: 0, uniqueDriverCount: 0, perVehicle: [], perDriver: [] },
      dateRange: { from: fromDate, to: toDate, isDefault: !(from || to) },
    };

    if (!result) return res.status(200).json(emptyResponse);

    /* ── Per-vehicle / per-driver breakdowns ────────────────── */
    const perVehicle = Object.values(
      result.vehicleTripCounts.reduce((acc, { vehicleId, vehicleNumber }) => {
        if (!vehicleId) return acc;
        const key = vehicleId.toString();
        acc[key] = acc[key] || { vehicleId: key, vehicleNumber, tripCount: 0 };
        acc[key].tripCount++;
        return acc;
      }, {})
    ).sort((a, b) => b.tripCount - a.tripCount);

    const perDriver = Object.values(
      result.driverTripCounts.reduce((acc, { driverId, driverContact, driverName }) => {
        if (!driverId) return acc;
        const key = driverId.toString();
        acc[key] = acc[key] || { driverId: key, driverContact, driverName, tripCount: 0 };
        acc[key].tripCount++;
        return acc;
      }, {})
    ).sort((a, b) => b.tripCount - a.tripCount);

    return res.status(200).json({
      success: true,
      count: result.totalTrips,
      data: result.trips,
      stats: { totalTrips: result.totalTrips, uniqueVehicleCount: result.uniqueVehicleCount, uniqueDriverCount: result.uniqueDriverCount, perVehicle, perDriver },
      dateRange: { from: fromDate, to: toDate, isDefault: !(from || to) },
    });

  } catch (error) {
    console.error("Error fetching closed trips:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch closed trips", error: error.message });
  }
};

export const getVehicleLiveStatus = asyncHandler(
  async (req, res) => {

    const { vehicleNumber } = req.params;

    if (!vehicleNumber) {
      throw new AppError(
        "Vehicle number is required",
        400
      );
    }

    // =========================
    // FIND VEHICLE
    // =========================

    const vehicle = await Vehicle.findOne({
      vehicleNumber: vehicleNumber.trim().toUpperCase()
    })
    .populate("currentFactoryId")
    .populate({
      path: "currentTrip",
      populate: [
        {
          path: "driverId"
        },
        {
          path: "sourceFactoryId"
        },
        {
          path: "destinationFactoryId"
        }
      ]
    });

    if (!vehicle) {
      throw new AppError(
        "Vehicle not found",
        404
      );
    }

    // =========================
    // VEHICLE FREE
    // =========================

    if (!vehicle.currentTrip) {

      return res.status(200).json({
        success: true,
        vehicleBusy: false,
        message: "Vehicle is currently free",
        vehicle: {
          _id: vehicle._id,
          vehicleNumber:
            vehicle.vehicleNumber
        }

      });

    }

    const trip = vehicle.currentTrip;

    // =========================
    // LAST HISTORY
    // =========================

    const lastHistory =
      trip.tripHistory?.[
        trip.tripHistory.length - 1
      ];

    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,
      vehicleBusy: true,
      message:`Vehicle currently engaged in trip`,
      vehicle: {
        _id: vehicle._id,
        vehicleNumber:vehicle.vehicleNumber,
        type: vehicle.type,
        currentFactory:vehicle.currentFactoryId || null
      },

      currentTrip: {
        _id: trip._id,
        tripState: trip.tripState,
        status: trip.status,
        phase: trip.phase,
        location: trip.location,
        purpose: trip.purpose,
        loadStatus: trip.loadStatus,
        startedAt: trip.startedAt,
        updatedAt: trip.updatedAt
      },

      driver: trip.driverId
        ? {
            _id: trip.driverId._id,
            driverName: trip.driverId.driverName,
            driverContact: trip.driverId.driverContact
          }
        : null,

      route: {
        sourceFactory: trip.sourceFactoryId || null,
        destinationFactory: trip.destinationFactoryId || null,
        externalSource: trip.externalSource || null,
      },

      lastMovement: lastHistory || null

    });

});