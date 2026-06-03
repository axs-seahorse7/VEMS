import mongoose from "mongoose";

// models
import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
import VehicleState from "../db/models/Vehicle-Model/vehicleState.model.js";
import Trip from "../db/models/Vehicle-Model/trip.model.js";
import GateLog from "../db/models/Vehicle-Model/gate.model.js";
import User from "../db/models/User-Model/user.model.js";
import Driver from "../db/models/Driver-model/driver.model.js";
import tripSegment from "../db/models/Vehicle-Model/tripSegment.model.js";
import DriverTripHistory from "../db/models/Driver-model/driverStats.model.js";
import {AlertEmailUsers} from "../db/models/Alert-Users/alertEmailUsers.model.js";

// utils
import AppError from "../utils/AppError.js";
import asyncHandler from "../middleware/Asynct-handler/asyncHandler.js";
import {alertMailSender, ALERT_TYPES} from "../services/alertMailSender.js";


// these controllers are not in use curremtly, and will remove later, 
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
      //  USER
      // ========================
      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("User not found", 400 );
      }

      // ========================
      //  VEHICLE (GET OR CREATE)
      // ========================
      const vehicle = await Vehicle.findOneAndUpdate(
        { vehicleNumber },
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
      //  DRIVER (GET OR CREATE)
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
      //  VEHICLE CHECK
      // ========================
      const existingTrip = await Trip.findOne({
        vehicleId: vehicle._id,
        tripState: { $in: ["ACTIVE", "COMPLETED", "PENDING"] }
      })
      .populate("currentFactoryId", "name")
      .populate("sourceFactoryId", "name")
      .populate("destinationFactoryId", "name")
      .session(session);

      const currentFactoryName = existingTrip?.currentFactoryId?.name || "Unknown Location";
      const sourceFactoryName = existingTrip?.sourceFactoryId?.name || existingTrip?.externalSource || "Unknown Location";
      const destinationFactoryName = existingTrip?.destinationFactoryId?.name || existingTrip?.externalDestination || "Unknown Location";

      if (existingTrip) {
        throw new AppError(`Vehicle already on a trip from "${sourceFactoryName}" to "${destinationFactoryName}"`, 400);
      }

      // ========================
      //  CREATE TRIP
      // ========================
      const tripPayload = {
        vehicleId: vehicle._id,
        driverId: driver._id,
        type: isInternalShifting? "internal_transfer" : "external_delivery",
        phase: isInternalShifting ? "ORIGIN" : "DESTINATION",
        location: isInternalShifting ? "inside_factory" : "outside_factory",
        arrivedAt: isInternalShifting? null : new Date(),
        externalSource: isInternalShifting ? null : req.body.source,
        sourceFactoryId: isInternalShifting ? user.factory._id: null,
        destinationFactoryId: isInternalShifting? req.body.destinationFactoryId: req.body.sourceFactoryId,
        purpose: req.body.purpose || "Delivery",
        reason:null,
        status: isInternalShifting? "ORIGIN" : "ARRIVED",
        loadStatus: "pending",
        startedAt: new Date(),
        materials: [{
          name: req.body.materialType?? "",
          material: req.body.material?? "",
          quantity: req.body.quantity,
          invoiceNo: req.body.invoiceNo,
          invoiceAmount: req.body.invoiceAmount,
          unit: req.body.unit,
          seal: req.body.seal || "sealed",
          customer: req.body.customer || null,
          supplier: req.body.supplier || null
        }],

        tripHistory: [
          {
            status: isInternalShifting? "ORIGIN": "ARRIVED",
            location: isInternalShifting? "inside_factory": "outside_factory",
            phase: isInternalShifting? "ORIGIN": "DESTINATION",
            actionBy: user?.email || "system",
            actionLocation: user?.workLocation,
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

      const newSegment = await tripSegment.create([{
        tripId: newTrip._id,
        triptype: "EXTERNAL",
        purpose: newTrip.purpose,
        segmentNumber: 1,
        materials: newTrip.materials[0],
        externalSource: newTrip.externalSource?? null,
        externalDestination: newTrip.externalDestination?? null,
        sourceFactoryId: newTrip.sourceFactoryId?? null,
        destinationFactoryId: newTrip.destinationFactoryId?? null,
        vehicleId: newTrip.vehicleId,
        driverId: newTrip.driverId,
        startedAt: newTrip.startedAt,
        completedAt: null,
      }], { session });

      // ========================
      // ASSIGN RELATIONS
      // ========================

      newTrip.currentSegment = newSegment[0]._id;
      await newTrip.save({ session });

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

      
      if (!vehicleNumber || !driverIdNumber) {
        throw new AppError(" vehicleNumber and driverIdNumber are required", 400);
      }

      
      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

     
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

     
      const existingTrip = await Trip.findOne({
        vehicleId: vehicle._id,
        tripState: {
          $in: ["ACTIVE", "PENDING"]
        }
      }).session(session);

      if (existingTrip) {
        throw new AppError("Vehicle already on a trip", 400);
      }

  
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
            location: "inside_factory",
            phase: "ORIGIN",
            actionBy: user?.email || "system",
            actionLocation: user?.workLocation,
            factoryId: user.factory?._id || null,
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

    const newSegment =  await tripSegment.create([{
        tripId: newTrip._id,
        triptype:"INTERNAL",
        purpose: newTrip.purpose,
        segmentNumber: 1,
        materials: newTrip.materials[0],
        externalSource: newTrip.externalSource?? null,
        externalDestination: newTrip.externalDestination?? null,
        sourceFactoryId: newTrip.sourceFactoryId?? null,
        destinationFactoryId: newTrip.destinationFactoryId?? null,
        vehicleId: newTrip.vehicleId,
        driverId: newTrip.driverId,
        startedAt: newTrip.startedAt,
        completedAt: null,
      }], { session });

    newTrip.currentSegment = newSegment[0]._id
    await newTrip.save({session})

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
        trip: newTrip,
        message: `New internal Trip for ${vehicle.vehicleNumber} has been created.`
      };

    });

    
  }  finally {
   await session.endSession();
  }

  return res.status(201).json(responseData);
});

export const updateVehicleTrip = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;

  try {
    await session.withTransaction(async () => {
      const { tripId } = req.params;

      // ========================
      //  FIND TRIP
      // ========================
      const trip = await Trip.findById(tripId)
        .populate("vehicleId")
        .populate("driverId")
        .session(session);

      if (!trip) {
        throw new AppError("Trip not found", 404);
      }

      // ========================
      //  PHASE CHECK — only ORIGIN
      // ========================
      if (( trip.type === "internal_transfer" && trip.phase !== "ORIGIN") || (trip.type === "external_delivery" && trip.phase !== "DESTINATION")) {
        throw new AppError("Trip can only be updated at the appropriate phase", 400);
      }

      // ========================
      //  15 MIN WINDOW CHECK
      // ========================
      const now = new Date();
      const startedAt = new Date(trip.startedAt);
      const diffInMinutes = (now - startedAt) / 1000 / 60;

      if (diffInMinutes > 15) {
        throw new AppError("Trip can no longer be updated. The 15-minute edit window has expired", 400);
      }

      // ========================
      // 4. TYPE-BASED LOCK CHECK
      // ========================
      if (trip.type === "internal_transfer") {
        // Lock after checkout — status moves away from ORIGIN after checkout
        const hasCheckedOut = trip.tripHistory.some(
          (h) => h.status !== "ORIGIN" && h.action !== "begin"
        );
        if (hasCheckedOut) {
          throw new AppError("Internal transfer cannot be updated after checkout", 400);
        }
      }

      if (trip.type === "external_delivery") {
        // Lock after checkin — checkin sets location to inside_factory
        const hasCheckedIn = trip.tripHistory.some(
          (h) => h.location === "inside_factory"
        );
        if (hasCheckedIn) {
          throw new AppError("External delivery cannot be updated after check-in", 400);
        }
      }

      // ========================
      //  BUILD UPDATE PAYLOAD
      // ========================
      const {
        driverName,
        driverContact,
        driverIdType,
        driverIdNumber,
        licenseNumber,
        typeOfVehicle,
        purpose,
        materialType,
        material,
        quantity,
        invoiceNo,
        invoiceAmount,
        unit,
        seal,
        customer,
        supplier,
        destinationFactoryId,
        source,
      } = req.body;

      // Update driver if driver fields provided
      // ========================
      //  HANDLE DRIVER UPDATE
      // ========================
      if (driverName || driverContact || driverIdNumber || licenseNumber) {

        const newIdNumber  = driverIdNumber  || trip.driverId.driverIdNumber;
        const newLicense   = licenseNumber   || trip.driverId.licenseNumber;
        const isSameDriver = String(trip.driverId.driverIdNumber) === String(newIdNumber);

        if (isSameDriver) {
          // Same driver — safe to update in-place
          await Driver.findByIdAndUpdate(
            trip.driverId._id,
            {
              $set: {
                ...(driverName    && { driverName }),
                ...(driverContact && { driverContact }),
                ...(driverIdType  && { driverIdType }),
                ...(driverIdNumber && { driverIdNumber }),
                ...(licenseNumber  && { licenseNumber }),
                ...(typeOfVehicle  && { typeOfVehicle }),
              }
            },
            { session }
          );
        } else {
          // Different ID number — find existing or create new driver
          const existingDriver = await Driver.findOne({
            $or: [
              { driverIdNumber: newIdNumber },
              ...(newLicense ? [{ licenseNumber: newLicense }] : [])
            ]
          }).session(session);

          if (existingDriver) {
            // Reassign trip to this existing driver
            await Trip.findByIdAndUpdate(
              tripId,
              { $set: { driverId: existingDriver._id } },
              { session }
            );
          } else {
            // Create a brand new driver record
            const newDriver = await Driver.create([{
              driverName:    driverName    || trip.driverId.driverName,
              driverContact: driverContact || trip.driverId.driverContact,
              driverIdType:  driverIdType  || trip.driverId.driverIdType,
              driverIdNumber: newIdNumber,
              licenseNumber:  newLicense,
              ...(typeOfVehicle && { typeOfVehicle }),
            }], { session });

            // Reassign trip to the new driver
            await Trip.findByIdAndUpdate(
              tripId,
              { $set: { driverId: newDriver[0]._id } },
              { session }
            );
          }
        }
      }

      // Build trip-level updates
      const tripUpdates = {
        ...(purpose && { purpose }),
        ...(destinationFactoryId && { destinationFactoryId }),
        ...(source && { externalSource: source }),
      };

      // Build material update (update first material entry)
      const materialUpdate = {
        ...(materialType && { "materials.0.name": materialType }),
        ...(material && { "materials.0.material": material }),
        ...(quantity !== undefined && { "materials.0.quantity": quantity }),
        ...(invoiceNo && { "materials.0.invoiceNo": invoiceNo }),
        ...(invoiceAmount !== undefined && { "materials.0.invoiceAmount": invoiceAmount }),
        ...(unit && { "materials.0.unit": unit }),
        ...(seal && { "materials.0.seal": seal }),
        ...(customer !== undefined && { "materials.0.customer": customer }),
        ...(supplier !== undefined && { "materials.0.supplier": supplier }),
      };

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        {
          $set: {
            ...tripUpdates,
            ...materialUpdate,
          }
        },
        { new: true, session }
      );

      // Sync tripSegment destination if changed
      if (destinationFactoryId) {
        await tripSegment.findOneAndUpdate(
          { tripId, segmentNumber: 1 },
          { $set: { destinationFactoryId } },
          { session }
        );
      }

      responseData = {
        success: true,
        trip: updatedTrip,
        message: "Trip updated successfully",
      };
    });

  } finally {
    await session.endSession();
  }

  return res.status(200).json(responseData);
});

export const checkinVehicle = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;
  try {
    let updatedTrip = null;

    await session.withTransaction(async () => {
      const { tripId } = req.params;

      const user = await User.findById(req.userId).populate("factory").session(session);
      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

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
      updatedTrip = await Trip.findByIdAndUpdate(
          tripId,
          {
            location: "inside_factory",
            checkedInAt: new Date(),
            tripState: "ACTIVE",
            $push: {
              tripHistory: {
                status: trip.status,
                location: "inside_factory",
                phase: "DESTINATION",
                actionBy: user?.email || "system",
                actionLocation: user?.workLocation,
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
                  completedAt: new Date()
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
          currentFactoryId:trip.destinationFactoryId || null,
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
                actionBy: user?.email || "system",
                actionLocation: user?.workLocation,
                factoryId: trip.destinationFactoryId || user.factory._id || null,
                action: "unload",
                timestamp: new Date(),
                segment: {
                  movementType: trip.type === "internal_transfer" ? "internal" : "external",
                  externalSource: trip.externalSource,
                  externalDestination: trip.externalDestination,
                  sourceFactoryId: trip.sourceFactoryId,
                  destinationFactoryId: trip.destinationFactoryId,
                  startedAt: trip.startedAt,
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

    });

    responseData = {
      success: true,
      trip: updatedTrip,
      message: "Vehicle unloaded successfully"
    };

  }finally {
   await session.endSession();
  }

 return  res.status(200).json(responseData);
};

export const completeTrip = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  let updatedTrip = null;
  try {
    await session.withTransaction(async () => {
      const { tripId } = req.params;

      const user = await User.findById(req.userId).populate("factory").session(session);
      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

      
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
                actionBy: user?.email || "system",
                actionLocation: user?.workLocation,
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


    });

    return res.status(200).json({
      success: true,
      trip: updatedTrip,
      message:"Trip completed successfully"
    });

  } catch (err) {
    throw new AppError(err.message || "Failed to complete trip", 500);

  } finally {

    session.endSession();

  }
});

export const checkoutVehicle = asyncHandler( async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);

    const user = await User.findById(req.userId).populate("factory");
    if (!user) {
      throw new AppError("Please login to continue", 400);
    }

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

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
              phase: "DESTINATION",
              actionBy: user?.email || "system",
              actionLocation: user?.workLocation,
              factoryId:trip.sourceFactoryId || null,
              action: "checkout",
              timestamp: new Date(),
              segment: {
                movementType:
                  trip.type === "internal_transfer" ? "internal" : "external",
                  externalSource:trip.externalSource,
                  externalDestination:trip.externalDestination,
                  sourceFactoryId:trip.sourceFactoryId,
                  destinationFactoryId:trip.destinationFactoryId,
                  startedAt:trip.startedAt,
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

    throw new AppError(err.message || "Failed to checkout vehicle", 500);

  }
});

export const checkoutAndExitVehicle = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  let updatedTrip = null;
  try {
    await session.withTransaction(async () => {
      const { tripId } = req.params;

      const user = await User.findById(req.userId).populate("factory").session(session);
      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

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
      updatedTrip = await Trip.findByIdAndUpdate(
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
                phase: "DESTINATION",
                actionBy: user?.email || "system",
                actionLocation: user?.workLocation,
                factoryId:trip.destinationFactoryId || null,
                action: "closed",
                timestamp: now,
                segment: {
                  movementType: trip.type ==="internal_transfer" ? "internal" : "external",
                  externalSource: null,
                  externalDestination:trip.externalDestination ?? null,
                  sourceFactoryId:trip.sourceFactoryId ?? null,
                  destinationFactoryId: trip.type === "internal_transfer"? trip.destinationFactoryId : null,
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

      const segmentId = updatedTrip.currentSegment
  
      if (segmentId) {
        await tripSegment.findByIdAndUpdate(
          segmentId,
          {
            status: updatedTrip.tripState,
            completedAt: new Date()
          },
          {
            new: true,
            session
          }
        );
      }

        

      // ========================
      // RELEASE DRIVER
      // ========================
      if (trip.driverId) {
        const duration = updatedTrip.completedAt && updatedTrip.startedAt
          ? Math.floor(( updatedTrip.completedAt - updatedTrip.startedAt ) / 1000 ): 0;

        await Driver.findByIdAndUpdate(
          trip.driverId,
          {
            $inc: {
              "stats.totalTime": duration
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
      success:  true,
      trip:     updatedTrip,
      message:  "Vehicle checked out and trip closed successfully"
    });

  } catch (err) {

    console.error(
      "Error in checkoutAndExitVehicle:",
      err
    );

    throw new AppError(err.message || "Failed to checkout and exit vehicle", 500);

  } finally {

    session.endSession();

  }
});

export const markArrived = asyncHandler( async (req, res) => {
  try { 
    const { tripId } = req.params;

    const user = await User.findById(req.userId).populate("factory");
    if (!user) {
      throw new AppError("Please login to continue", 400);
    }

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
    const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        {
          location: "outside_factory",
          status: "ARRIVED",
          phase: "DESTINATION",
          arrivedAt: new Date(), 
          $push: {
            tripHistory: {
              status: "ARRIVED",
              location: "outside_factory",
              phase: "DESTINATION",
              actionBy: user?.email || "system",
              actionLocation: user?.workLocation,
              factoryId: trip.destinationFactoryId || null,
              action: "arrived",
              timestamp: new Date(),
              segment: {
                movementType:trip.type === "internal_transfer" ? "internal" : "external",
                externalSource: trip.externalSource,
                externalDestination: trip.externalDestination,
                sourceFactoryId: trip.sourceFactoryId,
                destinationFactoryId: trip.destinationFactoryId,
                startedAt: trip.startedAt
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

      const user = await User.findById(req.userId).populate("factory").session(session);
      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

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
                phase: "DESTINATION",
                actionBy: user?.email || "system",
                actionLocation: user?.workLocation,
                location: trip.location,
                factoryId: trip.destinationFactoryId || null,
                action: "closed",
                timestamp: now,
                segment: {
                  movementType: "internal",
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
      const segmentId = updatedTrip.currentSegment
      if (segmentId) {
        const tripSegment = await TripSegment.findByIdAndUpdate(
          segmentId,
          {
            status: updatedTrip.tripState,
            completedAt: new Date()
          },
          {
            new: true,
            session
          }
        );
      }


      if (trip.driverId) {
        const duration = updatedTrip.completedAt && updatedTrip.startedAt
          ? Math.floor((updatedTrip.completedAt - updatedTrip.startedAt ) / 1000 ) : 0;

        await Driver.findByIdAndUpdate(
          trip.driverId,
          {
            $inc: {
              "stats.totalTime": duration
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

      const user = await User.findById(req.userId).populate("factory").session(session);
      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

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

      if (existingTrip.location !== "inside_factory") {
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
                  name: tripDetails?.materialType?? "",
                  material: tripDetails?.material?? "",
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
                actionBy: user?.email || "system",
                actionLocation: user?.workLocation,
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
    throw new AppError(err.message, 500);
  } finally {
    session.endSession();
  }
});

export const cancelTrip = asyncHandler( async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;
  let user = null;
  let trip = null;
  let updatedTrip = null;

  try {

    await session.withTransaction(async () => {
      const { tripId } = req.params;
      const {reason} = req.body;

      user = await User.findById(req.userId).populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

     trip = await Trip.findById(tripId)
        .populate("driverId", "driverName driverContact")
        .populate("vehicleId", "vehicleNumber type ")
        .populate("sourceFactoryId", "name location")
        .populate("destinationFactoryId", "name location")
        .session(session);

      if (!trip) {
        throw new AppError("Trip not found", 400);
      }

      if (["COMPLETED", "CLOSED", "CANCELLED"].includes(trip.tripState)) {
        throw new AppError(`Cannot cancel trip with state "${trip.tripState}"`);
      }

      const now = new Date();

      
      updatedTrip = await Trip.findByIdAndUpdate(
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
                actionBy: user?.email || "system",
                actionLocation: user?.workLocation,
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
       const segmentId = updatedTrip.currentSegment

       if(segmentId) {
        await tripSegment.findByIdAndUpdate(segmentId, {
          status: updatedTrip.tripState,
          completedAt: new Date()
        },{

          session
        })
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
    
    // After the transaction, replace the single mailResult with this:

    // 1. Fetch all active alert users for this destination factory
    const alertUsers = await AlertEmailUsers.find({
      factoryId: updatedTrip.destinationFactoryId,
      isActive: true,
    }).lean();

    // 2. Send to each user (or pass all emails at once if your mailer supports it)
    if (alertUsers.length > 0) {
      const mailPromises = alertUsers.map(alertUser =>
        alertMailSender({
          to: alertUser.email,
          alertType: ALERT_TYPES.TRIP_CANCELLED,
          payload: {
            trip: updatedTrip,
            recipientName: alertUser.name,
            reason: updatedTrip.reason,
            cancelledBy: user?.email || "system",
            driverName: trip.driverId?.driverName || "",
            driverContact: trip.driverId?.driverContact || "",
            vehicleNumber: trip.vehicleId?.vehicleNumber || "",
            vehicleType: trip.vehicleId?.type || "",
            cancelledAt: updatedTrip.completedAt,
            startedAt: updatedTrip.startedAt,
            sourceFactory: trip.sourceFactoryId?.name || trip.externalSource || "",
            destinationFactory: trip.destinationFactoryId?.name || trip.externalDestination || "",
            sourceFactoryLocation: trip.sourceFactoryId?.location || "",
            destinationFactoryLocation: trip.destinationFactoryId?.location || "",
          }
        })
      );

      const mailResults = await Promise.allSettled(mailPromises);
      
      // Log any failures without crashing the response
      mailResults.forEach((result, i) => {
        if (result.status === "rejected") {
          console.error(`Mail failed for ${alertUsers[i].email}:`, result.reason);
        } else {
          console.log(`Mail sent to ${alertUsers[i].email}`);
        }
      });
    }


    // ========================
    // RESPONSE
    // ========================
    responseData = {
      success: true,
      trip: updatedTrip,
      message:"Trip cancelled successfully"
    };
  } catch (err) {
    console.error("Error in cancelTrip:", err);
    return res.status(500).json({
      success:false,
      message: err.message
   });

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
      const {newDestinationFactoryId, customer, type } = req.body;

      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user?.factory) {
        throw new AppError(
          "User or factory not found"
        );
      }

  
      const trip = await Trip.findById(tripId)
      .session(session);

      if (!trip) {
        throw new AppError("Trip not found.");
      }

     
      if (["CLOSED", "CANCELLED"].includes(trip.tripState)) {
        throw new AppError(
          "Cannot change route of a closed or cancelled trip", 400
        );
      }

      if (type === "internal" && !newDestinationFactoryId) {
        throw new AppError(
          "New destination factory is required for internal transfer", 400
        );
      }

      if (type === "external" && !customer) {
        throw new AppError(
          "Customer is required for external movement", 400
        );
      }

      // ========================
      // SAME DESTINATION CHECK
      // ========================
      if (type === "internal" && String(trip.destinationFactoryId) === String(newDestinationFactoryId)) {
        throw new AppError(
          "Vehicle is already at this factory.", 400
        );
      }

      const now = new Date();

      // ========================
      // UPDATE PAYLOAD
      // ========================
      const updatePayload = {
        type:type === "external"? "external_delivery": "internal_transfer",
        purpose: trip.loadStatus === "loaded" && trip.purpose === "Pickup" ? "Delivery" : trip.purpose,
        loadStatus: trip.loadStatus === "loaded"? "pending" : trip.loadStatus,
        externalDestination:type === "external"? customer: null,
        sourceFactoryId:user.factory._id,
        destinationFactoryId:type === "internal"? newDestinationFactoryId: null,
        phase: "ORIGIN",
        status: "ROUTE_CHANGED",
        startedAt: now
      };

      // ========================
      // HISTORY SEGMENT
      // ========================
      const segmentData = {
        movementType: type,
        externalDestination:type === "internal"? null : customer,
        sourceFactoryId: trip.destinationFactoryId,
        destinationFactoryId: type === "internal" ? newDestinationFactoryId : null,
        startedAt: trip.startedAt,
        completedAt: now
      };

      
      updatedTrip = await Trip.findByIdAndUpdate(
          tripId,
          {
            ...updatePayload,
            $push: {
              tripHistory: {
                status: "ROUTE_CHANGED",
                phase: "ROUTE_UPDATE",
                actionBy: user?.email || "system",
                actionLocation: user?.workLocation,
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

   

    const segmentId = updatedTrip.currentSegment

    if(segmentId){
     await tripSegment.findByIdAndUpdate(segmentId, {
        status: "CLOSED",
        completedAt: new Date()
      },{
        new: true,
        session
      })

    }

    const existingSegments = await tripSegment.find({ tripId: updatedTrip._id }).session(session);

    let segmentCounter = null;
    if(existingSegments){
      segmentCounter = existingSegments.length + 1;
    }

    const newSegment = await tripSegment.create([{
        tripId: updatedTrip._id,
        triptype: updatedTrip.type === "internal_transfer"? "INTERNAL": "EXTERNAL",
        status: "ACTIVE",
        segmentNumber: segmentCounter || 1,
        materials: updatedTrip.materials[0],
        externalSource: updatedTrip.externalSource?? null,
        externalDestination: updatedTrip.externalDestination?? null,
        sourceFactoryId: updatedTrip.sourceFactoryId?? null,
        destinationFactoryId: updatedTrip.destinationFactoryId?? null,
        vehicleId: updatedTrip.vehicleId,
        driverId: updatedTrip.driverId,
        startedAt: updatedTrip.startedAt,
        completedAt: null,
      }], { session });

      updatedTrip.currentSegment = newSegment[0]._id
      await updatedTrip.save({session})

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

export const loadMaterialAndNewtrip = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;

  try {
    await session.withTransaction(async () => {

      const { tripId } = req.params;
      const { newTripDetails } = req.body;

      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

      if(user?.factory?._id?.toString() === newTripDetails?.newDestinationFactoryId?.toString()){
        throw new AppError(
          "You cannot select your current factory as Destination",
          400
        );
      }

      const currentTrip = await Trip.findById(tripId).session(session);

      if (!currentTrip) {
        throw new AppError("Trip not found", 404);
      }

      // Prevent duplicate operations
      if (currentTrip.tripState === "COMPLETED") {
        throw new AppError("Trip already completed", 400);
      }

      if (currentTrip.location !== "inside_factory") {
        throw new AppError(
          "Vehicle must be inside factory to load material",
          400
        );
      }

      // CLOSE CURRENT TRIP
      const updatedTrip = await Trip.findOneAndUpdate(
        {
          _id: tripId,
          loadStatus: "unloaded",
          tripState: { $nin: ["CLOSED", "CANCELLED"] }
        },
        {
          $set: {
            tripState: "CLOSED",
            completedAt: new Date(),
          },
          $push: {
            tripHistory: {
              status: currentTrip.status,
              location: currentTrip.location,
              phase: "DESTINATION",
              actionBy: user?.email || "system",
              actionLocation: user?.workLocation,
              factoryId: user.factory._id,
              action: "closed",
              timestamp: new Date(),
              segment: {
                movementType: currentTrip.type === "internal_transfer" ? "internal" : "external",
                externalSource: currentTrip.externalSource,
                externalDestination: currentTrip.externalDestination,
                sourceFactoryId: currentTrip.sourceFactoryId,
                destinationFactoryId: currentTrip.destinationFactoryId,
                startedAt: currentTrip.startedAt,
                completedAt: new Date()
              }
            }
            
          }
        },
        {
          new: true,
          session
        }
      );

      if (!updatedTrip) {
        throw new AppError(
          "Trip already closed or not loaded yet, cannot proceed",
          400
        );
      }

      

      // CREATE NEW TRIP
      const newTrip = await Trip.create(
        [
          {
            ...newTripDetails,
            type: newTripDetails.shipmentType === "internal" ? "internal_transfer" : "external_delivery",
            purpose: "Delivery",
            phase: "ORIGIN",
            location: "inside_factory",
            status: "ORIGIN",
            tripState: "ACTIVE",
            loadStatus: "pending",

            sourceFactoryId: user.factory._id,
            vehicleId: currentTrip.vehicleId,
            driverId: currentTrip.driverId,
            currentFactoryId: user.factory._id,
            destinationFactoryId: newTripDetails.shipmentType === "internal" ? newTripDetails.newDestinationFactoryId : undefined,
            externalDestination: newTripDetails.shipmentType === "external" ? newTripDetails.externalDestination : undefined,
            materials:[
              {
                name: newTripDetails.materialType ?? currentTrip.materials[0]?.name ?? "",
                material: newTripDetails.material ?? "",
                quantity: newTripDetails.quantity?? 0,
                invoiceNo: newTripDetails.invoiceNo ?? "",
                invoiceAmount: newTripDetails.invoiceAmount ?? 0,
                customer: newTripDetails.customer || "",
                supplier: newTripDetails.supplier || null,
                seal: newTripDetails.seal || "sealed",
              }
            ],

            tripHistory: [
              {
                status: "ORIGIN",
                location: "inside_factory",
                phase: "ORIGIN",
                actionBy: user?.email,
                actionLocation:user.workLocation,
                factoryId: user.factory._id,
                action: "begin",
                timestamp: new Date(),
                segment: {
                  movementType: newTripDetails.shipmentType === "internal" ? "internal" : "external",
                  externalSource: newTripDetails.shipmentType !== "internal" ? user.factory.name : null,
                  externalDestination: newTripDetails.shipmentType !== "internal" ? newTripDetails.newDestinationFactoryId : null,
                  sourceFactoryId: newTripDetails.shipmentType === "internal" ? user.factory._id : null,
                  destinationFactoryId: newTripDetails.shipmentType === "internal" ? newTripDetails.newDestinationFactoryId : null,
                  startedAt: new Date() 
                }
              }
            ],

        }
        ],
        { session }
      );

      const driverUpdate = {};

      if (currentTrip.driverId) {
        driverUpdate.activeTripId = newTrip[0]._id;
      }

      await Driver.findByIdAndUpdate(
        currentTrip.driverId,
        {
          $set: driverUpdate
        },
        {
          session
        }
      );

      await Vehicle.findByIdAndUpdate( currentTrip.vehicleId, {
        currentTrip: newTrip[0]._id
        },
        {
          session
        }
      );

      const segmentId = updatedTrip.currentSegment

      if(segmentId){
        await tripSegment.findByIdAndUpdate(segmentId, {
            status: "CLOSED",
            completedAt: new Date()
          },{
            new: true,
            session
          })

      }

    const newSegment =  await tripSegment.create([{
        tripId: newTrip[0]._id,
        triptype: newTrip[0].type === "internal_transfer"? "INTERNAL": "EXTERNAL",
        segmentNumber: 1,
        purpose: newTrip[0].purpose,
        materials: newTrip[0].materials[0],
        externalSource: newTrip[0].externalSource?? null,
        externalDestination: newTrip[0].externalDestination?? null,
        sourceFactoryId: newTrip[0].sourceFactoryId?? null,
        destinationFactoryId: newTrip[0].destinationFactoryId?? null,
        vehicleId: newTrip[0].vehicleId,
        driverId: newTrip[0].driverId,
        startedAt: newTrip[0].startedAt,
        completedAt: null,
      }], { session });

      newTrip[0].currentSegment = newSegment[0]._id
      await newTrip[0].save({session})

      responseData = {
        success: true,
        trip: updatedTrip,
        newTrip: newTrip[0],
        message: "Material loaded, current trip closed, and new trip created successfully"
      };

    });

  } catch (err) {
    console.error(
      "Error in loadMaterialAndNewtrip:",
      err
    );
    
    throw new AppError(err.message, 500);
    
  } finally {
    session.endSession();
  }
  return res.status(200).json(responseData);
});





// ========================
// GET VEHICLE TRIPS
// ========================

const lst36hr = new Date(Date.now() - 36 * 60 * 60 * 1000);


export const getVehicleTrips = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("factory");
    if (!user) throw new Error("User not found");
    const { tripId } = req.params;

    const factoryId = user.factory._id;
    const now = new Date();

    const matchStage = {
      _id: new mongoose.Types.ObjectId(tripId),

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
          arrivedAt: 1,
          checkedInAt: 1,
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

   return res.json(trips[0] || null);

  } catch (err) {
    console.error("Error fetching vehicle trips:", err);
    return res.status(400).json({ error: err.message });
  }
};

export const getLiveVehicleTrips = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("factory")
      .lean();

    if (!user || !user.factory) {
      return res.status(404).json({
        success: false,
        message: "User factory not found"
      });
    }

    const factoryId = user.factory;
    const page      = Number(req.query.page)  || 1;
    const limit     = Number(req.query.limit) || 20;
    const skip      = (page - 1) * limit;
    const filter    = req.query.filter || "all";   // <-- new
    const search      = req.query.search?.trim() || "";  // new


    // ── Build the filter-specific query ───────────────────────────────────────

    let matchQuery = {};

   // 1. resolve search BEFORE switch (just get the IDs)
    let vehicleIdFilter = null;
    if (search) {
      const matchingVehicles = await Vehicle.find({
        vehicleNumber: { $regex: search, $options: "i" }
      })
      .select("_id")
      .lean();

      const vehicleIds = matchingVehicles.map((v) => v._id);
      vehicleIdFilter = { $in: vehicleIds };
    }

    if (vehicleIdFilter) {
      matchQuery.vehicleId = vehicleIdFilter;
    }

    switch (filter) {
      
      case "all":
        matchQuery = {
            tripState: { $in: ["ACTIVE", "COMPLETED"] },
            $or: [
              { sourceFactoryId:      factoryId },
              { destinationFactoryId: factoryId },
            ],
          };
        break;
      // Vehicles waiting outside, heading to this factory
      case "waiting":
        matchQuery = {
          tripState:            { $in: ["ACTIVE", "COMPLETED"] },
          location:             "outside_factory",
          phase:                "DESTINATION",
          destinationFactoryId: factoryId,
        };
        break;

      // Vehicles physically inside this factory (as origin or destination)
      case "inside":
        matchQuery = {
          tripState: { $in: ["ACTIVE", "COMPLETED"] },
          location:  "inside_factory",
          $or: [
            { phase: "ORIGIN",      sourceFactoryId:      factoryId },
            { phase: "DESTINATION", destinationFactoryId: factoryId },
          ],
        };
        break;

      // Vehicles en-route, destination is this factory
      case "enroute":
        matchQuery = {
          tripState:            { $in: ["ACTIVE", "COMPLETED"] },
          location:             "enroute",
          destinationFactoryId: factoryId,
        };
        break;

      // Vehicles dispatched from this factory (en-route, source is this factory)
      case "dispatched":
        matchQuery = {
          tripState:       { $in: ["ACTIVE", "COMPLETED"] },
          location:        "enroute",
          status:         "IN_TRANSIT",
          phase:          "ORIGIN",
          sourceFactoryId: factoryId,
        };
        break;

      // Purpose-based filters — same base scope as "allVehicles" on client
      // (waiting ∪ inside ∪ enroute for this factory)
      case "pickup":
      case "delivery":
        matchQuery = {
          tripState: { $in: ["ACTIVE", "COMPLETED"] },
          purpose:   filter === "pickup" ? "Pickup" : "Delivery",
          $or: [
            { location: "outside_factory", phase: "DESTINATION", destinationFactoryId: factoryId },
            { location: "inside_factory",  $or: [
                { phase: "ORIGIN",      sourceFactoryId:      factoryId },
                { phase: "DESTINATION", destinationFactoryId: factoryId },
              ]
            },
            { location: "enroute", destinationFactoryId: factoryId },
          ],
        };
        break;

      // Material-based filters — match first element of materials array
      case "FG":
      case "RM": {
        const materialName = filter; // "FG" or "RM"
        matchQuery = {
          tripState: { $in: ["ACTIVE", "COMPLETED"] },
          $or: [
            { "materials.0.material": materialName },
            { "materials.0.name":     materialName },
          ],
          // same factory scope as allVehicles
          $and: [
            {
              $or: [
                { location: "outside_factory", phase: "DESTINATION", destinationFactoryId: factoryId },
                { location: "inside_factory", $or: [
                    { phase: "ORIGIN",      sourceFactoryId:      factoryId },
                    { phase: "DESTINATION", destinationFactoryId: factoryId },
                  ]
                },
                { location: "enroute", destinationFactoryId: factoryId },
              ],
            },
          ],
        };
        break;
      }

      // Closed / cancelled trips for this factory
      case "closed":
        matchQuery = {
          tripState: { $in: ["CLOSED", "CANCELLED"] },
          completedAt: { $gte: lst36hr },
          $or: [
            { sourceFactoryId:      factoryId },
            { destinationFactoryId: factoryId },
          ],
        };
        break;

      // "all" — active/completed trips touching this factory (original behaviour)
      default:
        matchQuery = {
          tripState: { $in: ["ACTIVE", "COMPLETED"] },
          completedAt: { $gte: lst36hr },
          $or: [
            { sourceFactoryId:      factoryId },
            { destinationFactoryId: factoryId },
          ],
        };
    }

    if (vehicleIdFilter) {
      matchQuery = {
        $and: [
          matchQuery,
          { vehicleId: vehicleIdFilter }
        ]
      };
    }

    // ── Run paginated query + count in parallel ───────────────────────────────

    const [trips, totalTrips] = await Promise.all([
      Trip.find(matchQuery)
        .select(`
          type phase location status tripState purpose reason loadStatus
          arrivedAt checkedInAt externalSource externalDestination
          materials createdAt startedAt completedAt updatedAt
          vehicleId driverId sourceFactoryId destinationFactoryId
        `)
        .populate({ path: "vehicleId",            select: "vehicleNumber type typeOfVehicle transporterName" })
        .populate({ path: "driverId",             select: "driverName driverContact" })
        .populate({ path: "sourceFactoryId",      select: "name location" })
        .populate({ path: "destinationFactoryId", select: "name location" })
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Trip.countDocuments(matchQuery),
    ]);

   

    // ── Format ────────────────────────────────────────────────────────────────

    const formattedTrips = trips.map((trip) => ({
      _id:                 trip._id,
      type:                trip.type,
      phase:               trip.phase,
      location:            trip.location,
      status:              trip.status,
      tripState:           trip.tripState,
      purpose:             trip.purpose,
      reason:              trip.reason,
      loadStatus:          trip.loadStatus,
      arrivedAt:           trip.arrivedAt,
      checkedInAt:         trip.checkedInAt,
      externalSource:      trip.externalSource,
      externalDestination: trip.externalDestination,
      createdAt:           trip.createdAt,
      startedAt:           trip.startedAt,
      completedAt:         trip.completedAt,
      updatedAt:           trip.updatedAt,

      vehicle: trip.vehicleId ? {
        _id:             trip.vehicleId._id,
        vehicleNumber:   trip.vehicleId.vehicleNumber,
        transporterName: trip.vehicleId.transporterName || null,
        vehicleType:     trip.vehicleId.type,
        typeOfVehicle:   trip.vehicleId.typeOfVehicle,
      } : null,

      driver: trip.driverId ? {
        _id:   trip.driverId._id,
        name:  trip.driverId.driverName,
        phone: trip.driverId.driverContact,
      } : null,

      sourceFactory: trip.sourceFactoryId ? {
        _id:      trip.sourceFactoryId._id,
        name:     trip.sourceFactoryId.name,
        location: trip.sourceFactoryId.location,
      } : null,

      destinationFactory: trip.destinationFactoryId ? {
        _id:      trip.destinationFactoryId._id,
        name:     trip.destinationFactoryId.name,
        location: trip.destinationFactoryId.location,
      } : null,

      material: Array.isArray(trip.materials) ? trip.materials[0] || null : null,
    }));

    // ── Response ──────────────────────────────────────────────────────────────

    const hasMore = skip + trips.length < totalTrips;

    return res.status(200).json({
      success: true,
      filter,
      page,
      limit,
      count:    formattedTrips.length,
      total:    totalTrips,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      trips:    formattedTrips,
    });

  } catch (err) {
    console.error("Error fetching live vehicle trips:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch live vehicle trips",
      error:   err.message,
    });
  }
};

export const getVehiclesLength = async (req, res) => {
  try{
    const user = await User.findById(req.userId).select("factory").lean();
    const factoryId = user?.factory;
    
    const [
      totalVehicles,
      totalInsideVehicles,
      totalOutsideVehicles,
      totalUpcomingVehicles,
      totalDispatchedVehicles,
      totalClosedVehicles,
      totalPickup,           
      totalDelivery,         
      totalFG,               
      totalRM,              
    ] = await Promise.all([
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, $or: [{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }], }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, location: "inside_factory",  phase: "DESTINATION", destinationFactoryId: factoryId }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, location: "outside_factory", phase: "DESTINATION", destinationFactoryId: factoryId }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, location: "enroute",         phase: "ORIGIN",      destinationFactoryId: factoryId }),
      // Dispatch -------
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, location: "enroute",         status: "IN_TRANSIT", phase: "ORIGIN", sourceFactoryId: factoryId }),
      // Closed / Cancelled in last 36hr
      Trip.countDocuments({ tripState: { $in: ["CLOSED", "CANCELLED"] }, completedAt: { $gte: lst36hr },      $or: [{ sourceFactoryId: factoryId}, {destinationFactoryId: factoryId}] }),

      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, purpose: "Pickup",   $or: [{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }] }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, purpose: "Delivery", $or: [{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }] }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, $or: [{ "materials.0.material": "FG" }, { "materials.0.name": "FG" }], $and: [{ $or: [{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }] }] }),
      Trip.countDocuments({ tripState: { $in: ["ACTIVE", "COMPLETED"] }, $or: [{ "materials.0.material": "RM" }, { "materials.0.name": "RM" }], $and: [{ $or: [{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }] }] }),
    ]);

     return res.status(200).json({
      success: true,
      totalVehicles,
      totalInsideVehicles,
      totalOutsideVehicles,
      totalUpcomingVehicles,
      totalDispatchedVehicles,
      totalClosedVehicles,
      totalPickup,
      totalDelivery,
      totalFG,
      totalRM,
     
    });

  }catch(er) {
    console.log("something is wrong", er.message)
    return res.status(500).send(er.message)
  }
}

export const closedAndCancelledTrips = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("factory").lean();
    if (!user || !user.factory) {
      return res.status(404).json({ message: "User or factory not found" });
    }

    const factoryId = user.factory;

    const now = new Date();
    const last36Hours = new Date(
      now.getTime() - (36 * 60 * 60 * 1000)
    );

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      $and: [
        {
          $or: [
            { destinationFactoryId: factoryId },
            { sourceFactoryId: factoryId }
          ]
        },
        {
          updatedAt: {
            $gte: last36Hours,
            $lte: now
          }
        },       
        {
          tripState: {
            $in: ["CLOSED", "CANCELLED"]
          }
        }
      ]
    };

    const trips = await Trip.find(filter)
    .select(`
      type
      phase
      location
      status
      tripState
      purpose
      reason
      loadStatus
      externalSource
      externalDestination
      materials
      createdAt
      startedAt
      completedAt
      vehicleId
      driverId
      sourceFactoryId
      destinationFactoryId        
    `)
    .populate("vehicleId", "vehicleNumber type typeOfVehicle transporterName")
    .populate("driverId", "driverName driverContact ")
    .populate("sourceFactoryId", "name location")
    .populate("destinationFactoryId", "name location")
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const formattedTrips = trips.map((trip) => ({
      _id: trip._id,
      type: trip.type,
      phase: trip.phase,
      location: trip.location,
      status: trip.status,
      tripState: trip.tripState,
      purpose: trip.purpose,
      reason: trip.reason,
      loadStatus: trip.loadStatus,
      externalSource: trip.externalSource,
      externalDestination: trip.externalDestination,
      createdAt: trip.createdAt,
      startedAt: trip.startedAt,
      completedAt: trip.completedAt,
      vehicle: trip.vehicleId
        ? {
            _id: trip.vehicleId._id,
            vehicleNumber: trip.vehicleId.vehicleNumber,
            transporterName: trip.vehicleId.transporterName || null,
            vehicleType: trip.vehicleId.type,
            typeOfVehicle: trip.vehicleId.typeOfVehicle
          }
        : null,

      driver: trip.driverId
        ? {
            _id: trip.driverId._id,
            name: trip.driverId.driverName,
            phone: trip.driverId.driverContact
          }
        : null,

      sourceFactory: trip.sourceFactoryId
        ? {
            _id: trip.sourceFactoryId._id,
            name: trip.sourceFactoryId.name,
            location: trip.sourceFactoryId.location
          }
        : null,

      destinationFactory: trip.destinationFactoryId
        ? {
            _id: trip.destinationFactoryId._id,
            name: trip.destinationFactoryId.name,
            location: trip.destinationFactoryId.location
          }
        : null,

      material: Array.isArray(trip.materials)
        ? trip.materials[0] || null
        : null
    }));

    const totalClosedCancelledTrips = await Trip.countDocuments(filter);
    const hasMore = skip + trips.length < totalClosedCancelledTrips;

    return res.status(200).json({
      success: true,
      count: trips.length,
      totalTrips: totalClosedCancelledTrips,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      trips: formattedTrips
    });
  }
    catch (err) {
    console.error("Error fetching closed/cancelled trips:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch closed/cancelled trips", error: err.message });
  }
};

export const getClosedTrips = async (req, res) => {
  try {
    const { vehicleNumber, driverContact, from, to, cursor, limit } = req.query;

    const user = await User.findById(req.userId).select("factory");
    if (!user || !user.factory) {
      return res.status(404).json({ message: "User or factory not found" });
    }

    const factoryId = user.factory;

    /* ── Pagination ─────────────────────────────────────────── */
    const PAGE_LIMIT = Math.min(parseInt(limit) || 20, 100); // default 20, hard cap 100

    // cursor = updatedAt ISO string of the last item received on the previous page
    const cursorDate = cursor ? new Date(cursor) : null;

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

    // Build the updatedAt filter for the DATA pipeline (includes cursor offset)
    const dataDateFilter = {};
    if (fromDate)   dataDateFilter.$gte = fromDate;
    if (toDate)     dataDateFilter.$lte = toDate;
    if (cursorDate) dataDateFilter.$lt  = cursorDate; // cursor: fetch older than last seen

    /* ── Base match for DATA pipeline ───────────────────────── */
    const baseMatch = {
      tripState: {
        $in: ["CLOSED", "CANCELLED"]
      },
      ...(Object.keys(dataDateFilter).length && { updatedAt: dataDateFilter }),
      $or: [
        { sourceFactoryId: factoryId },
        { destinationFactoryId: factoryId },
      ],
    };

    /* ── Base match for STATS pipeline (full range, no cursor) ─ */
    const statsDateFilter = {};
    if (fromDate) statsDateFilter.$gte = fromDate;
    if (toDate)   statsDateFilter.$lte = toDate;

    const statsBaseMatch = {
      tripState: {
        $in: ["CLOSED", "CANCELLED"]
      },
      ...(Object.keys(statsDateFilter).length && { updatedAt: statsDateFilter }),
      $or: [
        { sourceFactoryId: factoryId },
        { destinationFactoryId: factoryId },
      ],
    };

    /* ── Dynamic search filters (post-lookup) ───────────────── */
    const searchMatch = {
      ...(vehicleNumber && {
        "vehicle.vehicleNumber": { $regex: vehicleNumber, $options: "i" },
      }),
      ...(driverContact && {
        "driver.driverContact": { $regex: driverContact, $options: "i" },
      }),
    };

    /* ── Shared lookup + project stages ─────────────────────── */
    const lookupStages = [
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: false } },

      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "_id",
          as: "driver",
        },
      },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },

      ...(Object.keys(searchMatch).length ? [{ $match: searchMatch }] : []),

      {
        $lookup: {
          from: "factories",
          localField: "sourceFactoryId",
          foreignField: "_id",
          as: "sourceFactory",
        },
      },
      { $unwind: { path: "$sourceFactory", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "factories",
          localField: "destinationFactoryId",
          foreignField: "_id",
          as: "destinationFactory",
        },
      },
      { $unwind: { path: "$destinationFactory", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          // Trip meta
          _id: 1,
          type: 1,
          tripState: 1,
          startedAt: 1,
          updatedAt: 1,
          materials: 1,
          externalSource: 1,
          externalDestination: 1,

          // Vehicle
          "vehicle._id": 1,
          "vehicle.vehicleNumber": 1,
          "vehicle.type": 1,
          "vehicle.typeOfVehicle": 1,
          "vehicle.PUCExpiry": 1,

          // Driver
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
    ];

    /* ── Data pipeline — paginated ───────────────────────────── */
    const dataPipeline = [
      { $match: baseMatch },
      ...lookupStages,
      { $limit: PAGE_LIMIT + 1 }, // +1 to detect whether a next page exists
    ];

    /* ── Stats pipeline — full range, runs only on page 1 ───── */
    const statsPipeline = [
      { $match: statsBaseMatch },
      ...lookupStages,
      {
        $group: {
          _id: null,
          totalTrips:        { $sum: 1 },
          uniqueVehicles:    { $addToSet: "$vehicle._id" },
          uniqueDrivers:     { $addToSet: "$driver._id" },
          vehicleTripCounts: { $push: { vehicleNumber: "$vehicle.vehicleNumber", vehicleId: "$vehicle._id" } },
          driverTripCounts:  { $push: { driverContact: "$driver.driverContact", driverName: "$driver.driverName", driverId: "$driver._id" } },
        },
      },
      {
        $addFields: {
          uniqueVehicleCount: { $size: "$uniqueVehicles" },
          uniqueDriverCount:  { $size: "$uniqueDrivers" },
        },
      },
    ];

    // Run in parallel; skip stats on subsequent pages (cursor present) to save DB load
    const [dataResult, statsResult] = await Promise.all([
      Trip.aggregate(dataPipeline),
      !cursorDate ? Trip.aggregate(statsPipeline) : Promise.resolve([]),
    ]);

    /* ── Slice trips + determine hasMore ────────────────────── */
    const hasMore   = dataResult.length > PAGE_LIMIT;
    const trips     = hasMore ? dataResult.slice(0, PAGE_LIMIT) : dataResult;
    const nextCursor = hasMore && trips.length > 0
      ? trips[trips.length - 1].updatedAt.toISOString()
      : null;

    /* ── Empty first-page response ───────────────────────────── */
    if (trips.length === 0 && !cursorDate) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        stats: {
          totalTrips: 0,
          uniqueVehicleCount: 0,
          uniqueDriverCount: 0,
          perVehicle: [],
          perDriver: [],
        },
        pagination: {
          hasMore: false,
          nextCursor: null,
          limit: PAGE_LIMIT,
        },
        dateRange: { from: fromDate, to: toDate, isDefault: !(from || to) },
      });
    }

    
    let stats = { totalTrips: 0, uniqueVehicleCount: 0, uniqueDriverCount: 0, perVehicle: [], perDriver: [] };

    if (!cursorDate && statsResult.length > 0) {
      const [s] = statsResult;

      const perVehicle = Object.values(
        s.vehicleTripCounts.reduce((acc, { vehicleId, vehicleNumber }) => {
          if (!vehicleId) return acc;
          const key = vehicleId.toString();
          acc[key] = acc[key] || { vehicleId: key, vehicleNumber, tripCount: 0 };
          acc[key].tripCount++;
          return acc;
        }, {})
      ).sort((a, b) => b.tripCount - a.tripCount);

      const perDriver = Object.values(
        s.driverTripCounts.reduce((acc, { driverId, driverContact, driverName }) => {
          if (!driverId) return acc;
          const key = driverId.toString();
          acc[key] = acc[key] || { driverId: key, driverContact, driverName, tripCount: 0 };
          acc[key].tripCount++;
          return acc;
        }, {})
      ).sort((a, b) => b.tripCount - a.tripCount);

      stats = {
        totalTrips:         s.totalTrips,
        uniqueVehicleCount: s.uniqueVehicleCount,
        uniqueDriverCount:  s.uniqueDriverCount,
        perVehicle,
        perDriver,
      };
    }

    return res.status(200).json({
      success: true,
      count: trips.length,       
      data: trips,          
      stats,                   
      pagination: {
        hasMore,                    
        nextCursor,                
        limit: PAGE_LIMIT,
      },
      dateRange: { from: fromDate, to: toDate, isDefault: !(from || to) },
    });

  } catch (error) {
    console.error("Error fetching closed trips:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch closed trips",
      error: error.message,
    });
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

import ExcelJS from "exceljs";


const fmtDT = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { hour12: true }) : "";
 
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN") : "";
 
/* ══════════════════════════════════════════════════════════════
   EXCEL STYLE HELPERS
══════════════════════════════════════════════════════════════ */
 
const COLORS = {
  headerBg:    "1E293B",  // slate-800  — dark section label rows
  headerFg:    "FFFFFF",
  colHeaderBg: "F1F5F9",  // slate-100  — column name row
  colHeaderFg: "334155",
  seg1Bg:      "FFFFFF",  // first segment  — white
  seg2Bg:      "F8FAFC",  // alternating segment — off-white
  multiMatBg:  "FFF7ED",  // orange-50  — 2nd+ material row within same segment
  routeChangeBg: "EFF6FF", // blue-50   — route_change event in log
  evenRowBg:   "F8FAFC",
  white:       "FFFFFF",
};
 
/** Apply bold styled header to a row */
const styleHeader = (row, bgHex, fgHex) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgHex } };
    cell.font      = { bold: true, color: { argb: "FF" + fgHex }, name: "Arial", size: 9 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border    = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
  });
};
 
/** Apply standard data cell styling */
const styleData = (cell, bgHex) => {
  cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgHex } };
  cell.font      = { name: "Arial", size: 9 };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border    = {
    bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
    right:  { style: "hair", color: { argb: "FFE2E8F0" } },
  };
};
 
const styleRow = (row, bgHex) =>
  row.eachCell({ includeEmpty: true }, (cell) => styleData(cell, bgHex));
 

const TOLERANCE_MS = 1000; 
 
const isCheckout = (ev) => {
  const a = ev.action?.toLowerCase();
  const s = ev.status?.toLowerCase();
  return a === "checkout" || s === "checkout";
};
 
/** True if the event action/status is a route_change */
const isRouteChange = (ev) => {
  const a = ev.action?.toLowerCase();
  const s = ev.status?.toLowerCase();
  return a === "route_change" || s === "route_changed";
};
 
/**
 * @param {Array}  history       - full trip.tripHistory (sorted ascending by timestamp)
 * @param {Date}   windowStart   - TripSegment.startedAt
 * @param {Date}   windowEnd     - next TripSegment.startedAt OR trip close time
 * @param {Set}    claimedIds    - _id strings already assigned; mutated in place
 * @returns {Array} history entries that belong to this segment, sorted by timestamp
 */
function eventsForWindow(history, windowStart, windowEnd, claimedIds) {
  if (!windowStart) return [];
 
  const segStart = new Date(windowStart).getTime();
  const segEnd   = windowEnd ? new Date(windowEnd).getTime() : Infinity;
 
  // ── Pass 1: segment snapshot match ──────────────────────────
  const pass1 = [];
  for (const ev of history) {
    if (!ev.timestamp) continue;
    const evId = ev._id?.toString();
    if (evId && claimedIds.has(evId)) continue;
 
    if (ev.segment?.startedAt) {
      const snapStart = new Date(ev.segment.startedAt).getTime();
      if (Math.abs(snapStart - segStart) <= TOLERANCE_MS) {
        pass1.push(ev);
        if (evId) claimedIds.add(evId);
      }
    }
  }
 
  // ── Pass 2: checkout look-ahead (business rule) ──────────────
  // If this segment contains a ROUTE_CHANGED event, the very next
  // unclaimed CHECKOUT in the full history belongs to this segment,
  // regardless of its timestamp.
  const hasRouteChange = pass1.some(isRouteChange);
  if (hasRouteChange) {
    // Find the last ROUTE_CHANGED event in this segment to anchor the search
    const lastRC = [...pass1].filter(isRouteChange).pop();
    const rcTime = lastRC ? new Date(lastRC.timestamp).getTime() : segStart;
 
    // Walk forward in history to find the first unclaimed CHECKOUT after rcTime
    for (const ev of history) {
      if (!ev.timestamp) continue;
      const evId = ev._id?.toString();
      if (evId && claimedIds.has(evId)) continue;
      if (!isCheckout(ev)) continue;
 
      const t = new Date(ev.timestamp).getTime();
      if (t >= rcTime) {
        // Claim it for this segment — it's the post-route-change checkout
        pass1.push(ev);
        if (evId) claimedIds.add(evId);
        break; // only the first unclaimed checkout after RC belongs here
      }
    }
  }
 
  // ── Pass 3: timestamp window fallback ───────────────────────
  const pass1Ids = new Set(pass1.map((e) => e._id?.toString()));
  const pass3 = [];
  for (const ev of history) {
    if (!ev.timestamp) continue;
    const evId = ev._id?.toString();
    if (evId && claimedIds.has(evId)) continue;  // already owned
    if (evId && pass1Ids.has(evId))   continue;  // already in pass1
 
    // Never let checkout fall through to timestamp matching —
    // it will be grabbed by Pass 2 of the correct segment instead.
    if (isCheckout(ev)) continue;
 
    const t = new Date(ev.timestamp).getTime();
    if (t >= segStart - TOLERANCE_MS && t < segEnd + TOLERANCE_MS) {
      pass3.push(ev);
    }
  }
 
  // Mark pass3 survivors as claimed
  pass3.forEach((e) => {
    const id = e._id?.toString();
    if (id) claimedIds.add(id);
  });
 
  // Merge and sort by timestamp
  return [...pass1, ...pass3].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
}
 
function pickEventTime(events, ...targets) {
  const upper = targets.map((t) => t.toUpperCase());
  const found = events.find(
    (ev) =>
      upper.includes(ev.action?.toUpperCase()) ||
      upper.includes(ev.status?.toUpperCase())
  );
  return fmtDT(found?.timestamp);
}
 
/* ══════════════════════════════════════════════════════════════
   CONTROLLER
══════════════════════════════════════════════════════════════ */
 
export const getDownloadTrips = async (req, res) => {
  try {
    const { from, to } = req.query;
 
    /* ── 1. Auth / factory resolution ───────────────────────── */
    const user = await User.findById(req.userId).select("factory").lean();
    if (!user?.factory) {
      return res.status(404).json({ message: "User or factory not found" });
    }
    const factoryId = user.factory;
 
    /* ── 2. Build date range ─────────────────────────────────── */
    let fromDate, toDate;
    if (from || to) {
      fromDate = from ? new Date(from) : null;
      toDate   = to   ? new Date(to)   : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);
    } else {
      // default: last 36 hours
      toDate   = new Date();
      fromDate = new Date(toDate.getTime() - 36 * 60 * 60 * 1000);
    }
 
    const dateFilter = {};
    if (fromDate) dateFilter.$gte = fromDate;
    if (toDate)   dateFilter.$lte = toDate;
    const trips = await Trip.aggregate([
      {
        $match: {
          tripState: { $in: ["CLOSED", "CANCELLED"] },
          ...(Object.keys(dateFilter).length && { updatedAt: dateFilter }),
          $or: [
            { sourceFactoryId: factoryId },
            { destinationFactoryId: factoryId },
          ],
        },
      },
      // vehicle — required; skip trips with no vehicle
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: false } },
      // driver — optional
      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "_id",
          as: "driver",
        },
      },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
      { $sort: { updatedAt: -1 } },
    ]);
 
    if (!trips.length) {
      return res.status(404).json({ message: "No trips found for the given range." });
    }
 
    const tripIds = trips.map((t) => t._id);
 
    const rawSegments = await tripSegment.aggregate([
      { $match: { tripId: { $in: tripIds } } },
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
      // driver per segment
      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "_id",
          as: "driver",
        },
      },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
      // source factory
      {
        $lookup: {
          from: "factories",
          localField: "sourceFactoryId",
          foreignField: "_id",
          as: "sourceFactory",
        },
      },
      { $unwind: { path: "$sourceFactory", preserveNullAndEmptyArrays: true } },
      // destination factory
      {
        $lookup: {
          from: "factories",
          localField: "destinationFactoryId",
          foreignField: "_id",
          as: "destinationFactory",
        },
      },
      { $unwind: { path: "$destinationFactory", preserveNullAndEmptyArrays: true } },
      // sort: trip first, then segment order within trip
      { $sort: { tripId: 1, segmentNumber: 1 } },
    ]);
 
    const segmentsByTrip = new Map();
    for (const seg of rawSegments) {
      const key = seg.tripId.toString();
      if (!segmentsByTrip.has(key)) segmentsByTrip.set(key, []);
      segmentsByTrip.get(key).push(seg);
    }
 
    /* ════════════════════════════════════════════════════════════
       BUILD WORKBOOK
    ════════════════════════════════════════════════════════════ */
    const wb = new ExcelJS.Workbook();
    wb.creator = "Fleet Management System";
    wb.created = new Date();
 
    const wsDetail = wb.addWorksheet("Trip Details", {
      views:     [{ state: "frozen", ySplit: 2 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });
 
    wsDetail.columns = [
      // TRIP INFO (cols 1-4)
      { key: "tripId",        width: 28 },
      { key: "segNo",         width: 8  },
      { key: "tripType",      width: 18 },
      { key: "purpose",       width: 14 },
      // VEHICLE (cols 5-8)
      { key: "vehicleNo",     width: 16 },
      { key: "vehicleCat",    width: 16 },
      { key: "vehicleType",   width: 18 },
      { key: "pucExpiry",     width: 14 },
      // DRIVER (cols 9-13)
      { key: "driverName",    width: 18 },
      { key: "driverContact", width: 14 },
      { key: "driverIdType",  width: 14 },
      { key: "driverIdNo",    width: 16 },
      { key: "licenseNo",     width: 16 },
      // ROUTE (cols 14-19)
      { key: "srcFactory",    width: 20 },
      { key: "srcLocation",   width: 18 },
      { key: "dstFactory",    width: 20 },
      { key: "dstLocation",   width: 18 },
      { key: "extSource",     width: 20 },
      { key: "extDest",       width: 20 },
      // SEGMENT TIMING (cols 20-21)
      { key: "segStartedAt",  width: 22 },
      { key: "segCompletedAt",width: 22 },
      // TIMELINE (cols 22-30)
      { key: "tBegin",        width: 20 },
      { key: "tArrived",      width: 20 },
      { key: "tCheckin",      width: 20 },
      { key: "tCheckout",     width: 20 },
      { key: "tLoad",         width: 20 },
      { key: "tUnload",       width: 20 },
      { key: "tDestination",  width: 20 },
      { key: "tRouteChange",  width: 20 },
      { key: "tClosed",       width: 20 },
      // MATERIAL (cols 31-39)
      { key: "matName",       width: 18 },
      { key: "matType",       width: 16 },
      { key: "qty",           width: 10 },
      { key: "unit",          width: 8  },
      { key: "invoiceNo",     width: 16 },
      { key: "invoiceAmt",    width: 16 },
      { key: "seal",          width: 12 },
      { key: "supplier",      width: 18 },
      { key: "customer",      width: 18 },
    ];
 
    // Row 1 — section label spans
    const labelRow1 = wsDetail.addRow([]);
    const sectionDefs = [
      { col: 1,  span: 4,  label: "TRIP INFO"        },
      { col: 5,  span: 4,  label: "VEHICLE"          },
      { col: 9,  span: 5,  label: "DRIVER"           },
      { col: 14, span: 6,  label: "ROUTE"            },
      { col: 20, span: 2,  label: "SEGMENT TIMING"   },
      { col: 22, span: 9,  label: "TIMELINE"         },
      { col: 31, span: 9,  label: "MATERIAL / CARGO" },
    ];
    sectionDefs.forEach(({ col, span, label }) => {
      labelRow1.getCell(col).value = label;
      if (span > 1) wsDetail.mergeCells(1, col, 1, col + span - 1);
    });
    styleHeader(labelRow1, COLORS.headerBg, COLORS.headerFg);
    labelRow1.height = 22;
 
    // Row 2 — column headers
    const headerRow1 = wsDetail.addRow([
      "Trip ID", "Seg #", "Trip Type", "Purpose",
      "Vehicle No.", "Category", "Vehicle Type", "PUC Expiry",
      "Driver Name", "Contact", "ID Type", "ID Number", "License No.",
      "Source Factory", "Source Location", "Dest. Factory", "Dest. Location", "Ext. Source", "Ext. Dest.",
      "Seg Started At", "Seg Completed At",
      "Begin", "Arrived", "Check-In", "Check-Out", "Loaded", "Unloaded", "At Destination", "Route Changed", "Closed",
      "Material", "Mat. Type", "Qty", "Unit", "Invoice No.", "Invoice Amt (₹)", "Seal", "Supplier", "Customer",
    ]);
    styleHeader(headerRow1, COLORS.colHeaderBg, COLORS.colHeaderFg);
    headerRow1.height = 32;
 
    const wsLog = wb.addWorksheet("Event Log", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
 
    wsLog.columns = [
      { key: "tripId",     width: 28 },
      { key: "segNo",      width: 8  },
      { key: "vehicleNo",  width: 16 },
      { key: "driverName", width: 18 },
      { key: "evtNo",      width: 8  },
      { key: "status",     width: 18 },
      { key: "action",     width: 16 },
      { key: "location",   width: 18 },
      { key: "phase",      width: 18 },
      { key: "actionBy",   width: 26 },
      { key: "actionLoc",  width: 16 },
      { key: "factory",    width: 20 },
      { key: "timestamp",  width: 22 },
    ];
 
    const logHeaderRow = wsLog.addRow([
      "Trip ID", "Seg #", "Vehicle No.", "Driver", "Event #",
      "Status", "Action", "Location", "Phase",
      "Action By", "Action Location", "Factory", "Timestamp",
    ]);
    styleHeader(logHeaderRow, COLORS.headerBg, COLORS.headerFg);
    logHeaderRow.height = 24;
 
    /* ────────────────────────────────────────────────────────────
       SHEET 3 — SUMMARY
    ──────────────────────────────────────────────────────────── */
    const wsSummary = wb.addWorksheet("Summary");
    wsSummary.columns = [{ width: 30 }, { width: 22 }, { width: 16 }];
 
    // counters for summary — populated while iterating trips below
    let totalSegments = 0;
    const vehicleMap  = {}; // vehicleNo → { docs, segments }
    const driverMap   = {}; // driverName → { contact, docs, segments }
 
    /* ════════════════════════════════════════════════════════════
       MAIN DATA LOOP — iterate trips → segments → materials
    ════════════════════════════════════════════════════════════ */
    for (const trip of trips) {
      const tripIdStr  = trip._id.toString();
      const history    = trip.tripHistory || [];
      const segments   = segmentsByTrip.get(tripIdStr) || [];
 
      // Sort history by timestamp ascending for reliable window mapping
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
 
      const effectiveSegments = segments.length > 0 ? segments : [
              {
                _id:                  trip._id,          // fake id
                tripId:               trip._id,
                segmentNumber:        1,
                triptype:             trip.type === "internal_transfer" ? "INTERNAL" : "EXTERNAL",
                purpose:              trip.purpose || "",
                vehicleId:            trip.vehicleId,
                driverId:             trip.driverId,
                vehicle:              trip.vehicle,
                driver:               trip.driver,
                sourceFactoryId:      trip.sourceFactoryId,
                destinationFactoryId: trip.destinationFactoryId,
                sourceFactory:        trip.sourceFactory,  
                destinationFactory:   trip.destinationFactory,
                externalSource:       trip.externalSource      || "",
                externalDestination:  trip.externalDestination || "",
                materials:            trip.materials?.[0] || null,
                startedAt:            trip.startedAt,
                completedAt:          trip.completedAt || trip.updatedAt,
                status:               trip.tripState,
                _synthetic:           true,
              },
            ];
 
      totalSegments += effectiveSegments.length;
 
      /* Summary: vehicle-level count */
      effectiveSegments.forEach((seg) => {
        const vn = seg.vehicle?.vehicleNumber || trip.vehicle?.vehicleNumber || "Unknown";
        vehicleMap[vn] = vehicleMap[vn] || { docs: new Set(), segments: 0 };
        vehicleMap[vn].docs.add(tripIdStr);
        vehicleMap[vn].segments++;
 
        const dn = seg.driver?.driverName || trip.driver?.driverName || "Unknown";
        const dc = seg.driver?.driverContact || trip.driver?.driverContact || "";
        driverMap[dn] = driverMap[dn] || { contact: dc, docs: new Set(), segments: 0 };
        driverMap[dn].docs.add(tripIdStr);
        driverMap[dn].segments++;
      });
 
      const claimedIds = new Set();
 
      /* ── Process each segment ── */
      effectiveSegments.forEach((seg, segIdx) => {
        const isLastSeg = segIdx === effectiveSegments.length - 1;
 
        /* Time window for history mapping */
        const windowStart = seg.startedAt;
        const windowEnd   = isLastSeg
          ? (trip.completedAt || trip.updatedAt)          // last seg goes to trip close
          : effectiveSegments[segIdx + 1].startedAt;      // else next seg's start
 
        const segEvents = eventsForWindow(sortedHistory, windowStart, windowEnd, claimedIds);
 
        /* Resolved vehicle/driver — prefer segment-level, fall back to trip */
        const vehicle = seg.vehicle || trip.vehicle || {};
        const driver  = seg.driver  || trip.driver  || {};
 
        /* Resolved factories — segment has its own populated factories */
        const srcFactory = seg.sourceFactory      || {};
        const dstFactory = seg.destinationFactory || {};
 
        /* Timeline from segment-scoped events */
        const timeline = [
          pickEventTime(segEvents, "begin"),
          pickEventTime(segEvents, "arrived"),
          pickEventTime(segEvents, "checkin"),
          pickEventTime(segEvents, "checkout"),
          pickEventTime(segEvents, "load"),
          pickEventTime(segEvents, "unload"),
          pickEventTime(segEvents, "destination", "complete"),
          pickEventTime(segEvents, "route_change"),
          // closed timestamp only on last segment
          isLastSeg ? fmtDT(trip.completedAt || trip.updatedAt) : "",
        ];
 
        let materials;
        if (seg._synthetic) {
          // synthetic segment — use trip.materials array
          materials = trip.materials?.length ? trip.materials : [null];
        } else if (seg.materials && Object.keys(seg.materials).length > 0) {
          // segment has its own material object — wrap in array
          materials = [seg.materials];
        } else {
          // no segment-level material — use trip.materials as fallback
          materials = trip.materials?.length ? trip.materials : [null];
        }
 
        /* ── Emit one Excel row per material ── */
        materials.forEach((mat, mIdx) => {
          const bgHex = mIdx === 0
            ? (segIdx % 2 === 0 ? COLORS.seg1Bg : COLORS.seg2Bg)
            : COLORS.multiMatBg; // extra material rows get orange tint
 
          const rowData = [
            // TRIP INFO
            tripIdStr,
            `Seg ${seg.segmentNumber}`,
            seg.triptype === "INTERNAL" ? "Internal" : "External",
            seg.purpose || trip.purpose || "",
            // VEHICLE
            vehicle.vehicleNumber      || "",
            vehicle.typeOfVehicle      || "",
            vehicle.type === "internal" ? "Internal" : "External",
            fmtDate(vehicle.PUCExpiry),
            // DRIVER
            driver.driverName          || "",
            driver.driverContact       || "",
            driver.driverIdType        || "",
            driver.driverIdNumber      || "",
            driver.licenseNumber       || "",
            // ROUTE
            srcFactory.name            || "",
            srcFactory.location        || "",
            dstFactory.name            || "",
            dstFactory.location        || "",
            seg.externalSource         || trip.externalSource         || "",
            seg.externalDestination    || trip.externalDestination    || "",
            // SEGMENT TIMING
            fmtDT(seg.startedAt),
            fmtDT(seg.completedAt),
            // TIMELINE
            ...timeline,
            // MATERIAL
            mat?.name          || "",
            mat?.material      || "",
            mat?.quantity      ?? "",
            mat?.unit          || "",
            mat?.invoiceNo     || "",
            mat?.invoiceAmount ?? "",
            mat?.seal          || "",
            mat?.supplier      || "",
            mat?.customer      || "",
          ];
 
          const dataRow = wsDetail.addRow(rowData);
          dataRow.height = 18;
          styleRow(dataRow, bgHex);
 
          // Bold Trip ID on first material row of each segment
          if (mIdx === 0) {
            dataRow.getCell(1).font = { bold: true, name: "Arial", size: 9 };
          }
        });
 
        /* ── Emit one Event Log row per history event in this window ── */
        segEvents.forEach((ev, evIdx) => {
          const isRouteChange = ev.action?.toUpperCase() === "ROUTE_CHANGE" ||
                                ev.status?.toUpperCase() === "ROUTE_CHANGED";
 
          const logRow = wsLog.addRow([
            tripIdStr,
            `Seg ${seg.segmentNumber}`,
            vehicle.vehicleNumber  || "",
            driver.driverName      || "",
            evIdx + 1,
            ev.status              || "",
            ev.action              || "",
            ev.location            || "",
            ev.phase               || "",
            ev.actionBy            || "",
            ev.actionLocation      || "",
            ev.factory?.name       || "",  
            fmtDT(ev.timestamp),
          ]);
          logRow.height = 16;
          styleRow(
            logRow,
            isRouteChange
              ? COLORS.routeChangeBg
              : evIdx % 2 === 0 ? COLORS.white : COLORS.evenRowBg
          );
        });
      });
    } // end trips loop
 
    /* ── Autofilters ── */
    wsDetail.autoFilter = {
      from: { row: 2, column: 1 },
      to:   { row: 2, column: wsDetail.columns.length },
    };
    wsLog.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: wsLog.columns.length },
    };
 
    /* ════════════════════════════════════════════════════════════
       SHEET 3 — SUMMARY  (fill now that we have all counts)
    ════════════════════════════════════════════════════════════ */
    const addSummaryKV = (label, value, bold = false) => {
      const r = wsSummary.addRow([label, value]);
      if (bold) {
        r.getCell(1).font = { bold: true, name: "Arial", size: 10 };
        r.getCell(2).font = { bold: true, name: "Arial", size: 10 };
      }
    };
 
    addSummaryKV("Fleet Trip Download Report", "", true);
    addSummaryKV("Generated At",  new Date().toLocaleString("en-IN"));
    addSummaryKV("Date Range",    `${fmtDate(fromDate)} → ${fmtDate(toDate)}`);
    wsSummary.addRow([]);
    addSummaryKV("Total Trip Documents", trips.length,    true);
    addSummaryKV("Total Segments",       totalSegments,   true);
    wsSummary.addRow([]);
 
    // Per-vehicle table
    const vHeader = wsSummary.addRow(["Vehicle No.", "Trip Documents", "Segments"]);
    styleHeader(vHeader, COLORS.colHeaderBg, COLORS.colHeaderFg);
    Object.entries(vehicleMap)
      .sort((a, b) => b[1].segments - a[1].segments)
      .forEach(([vn, d]) => {
        const r = wsSummary.addRow([vn, d.docs.size, d.segments]);
        r.eachCell((c) => styleData(c, COLORS.white));
      });
 
    wsSummary.addRow([]);
 
    // Per-driver table
    const dHeader = wsSummary.addRow(["Driver", "Contact", "Trip Documents"]);
    styleHeader(dHeader, COLORS.colHeaderBg, COLORS.colHeaderFg);
    Object.entries(driverMap)
      .sort((a, b) => b[1].docs.size - a[1].docs.size)
      .forEach(([dn, d]) => {
        const r = wsSummary.addRow([dn, d.contact, d.docs.size]);
        r.eachCell((c) => styleData(c, COLORS.white));
      });
 
    /* ════════════════════════════════════════════════════════════
       STREAM RESPONSE
    ════════════════════════════════════════════════════════════ */
    const filename = `fleet-trips-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
 
    await wb.xlsx.write(res);
    res.end();
 
  } catch (error) {
    console.error("Error generating trip download:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate trip report",
      error: error.message,
    });
  }
};