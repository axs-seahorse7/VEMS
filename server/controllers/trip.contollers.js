import mongoose from "mongoose";
import ExcelJS from "exceljs";


// models
import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
import Trip from "../db/models/Vehicle-Model/trip.model.js";
import User from "../db/models/User-Model/user.model.js";
import Driver from "../db/models/Driver-model/driver.model.js";
import tripSegment from "../db/models/Vehicle-Model/tripSegment.model.js";
import DriverTripHistory from "../db/models/Driver-model/driverStats.model.js";
import {AlertEmailUsers} from "../db/models/Alert-Users/alertEmailUsers.model.js";
import Site from "../db/models/Vehicle-Model/site.model.js";

// utils
import AppError from "../utils/AppError.js";
import asyncHandler from "../middleware/Asynct-handler/asyncHandler.js";
import {alertMailSender, ALERT_TYPES} from "../services/alertMailSender.js";
import computeWorkflow from "../helper/workflow/computeWorkFlow.js";
import getTripPhase from "../helper/workflow/getTripPhase.js";


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

// ======================== REGISTER EXTERNAL VEHICLE ========================
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
          $set: {
            typeOfVehicle: req.body.typeOfVehicle,
            transporterName: req.body.transporterName ?? null,
            ownerFactoryId: req.body.ownerFactoryId ?? null,
            PUCExpiry: req.body.PUCExpiry ?? null,
          },
          $setOnInsert: {
            vehicleNumber,
            type: "internal"
          }
        },
        { new: true, upsert: true, session }
      );



      const driver = await Driver.findOneAndUpdate(
        {
          $or: [
            { driverIdNumber },
            { licenseNumber }
          ]
        },
        {
          $set: {
            driverName,
            driverContact,
            driverIdType,
            licenseNumber,
            typeOfVehicle
          },
          $setOnInsert: {
            driverIdNumber
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
        isIntraPlant: req.body.isIntraPlant || false,
        siteId: req.body.siteId || null,
        blockId: req.body.blockId || null,
        currentFactoryId:user.factory._id || null,
        purpose: req.body.purpose || "Delivery",
        reason:null,
        status: isInternalShifting? "ORIGIN" : "ARRIVED",
        loadStatus: "pending",
        startedAt: new Date(),
        waitingSince:new Date(),
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
            actionDetails: {
              siteId: user?.siteId || null,
              blockId: user?.blockId || null
            },
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

// ======================== REGISTER INTERNAL VEHICLE ========================
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
        isIntraPlant,
        siteId,
        blockId,
        purpose
      } = req.body;


      if (!vehicleNumber || !driverIdNumber) {
        throw new AppError(" Vehicle Number and Driver Id are required", 400);
      }

      
      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("Your session is expired, please login again", 400);
      }

    const vehicle = await Vehicle.findOneAndUpdate(
        { vehicleNumber },
        {
          $set: {
            typeOfVehicle: req.body.typeOfVehicle,
            transporterName : req.body.transporterName ?? null,
            ownerFactoryId: req.body.ownerFactoryId ?? null,
            PUCExpiry: req.body.PUCExpiry ?? null,
          },
          $setOnInsert: {
            vehicleNumber,
            type: "internal"
          }
        },
        { new: true, upsert: true, session }
      );

      const driver = await Driver.findOneAndUpdate(
        {
          $or: [
            { driverIdNumber },
            { licenseNumber }
          ]
        },
        {
          $set: {
            driverName,
            driverContact,
            driverIdType,
            licenseNumber
          },
          $setOnInsert: {
            driverIdNumber
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
        vehicleId         : vehicle._id,
        driverId          : driver._id,
        type              : "internal_transfer",
        phase             : "ORIGIN",
        location          : "inside_factory",
        currentFactoryId  : user.factory?._id || null,
        sourceFactoryId   : user.factory?._id || null,
        destinationFactoryId: isIntraPlant? user.factory?._id : destinationFactoryId || null,
        isIntraPlant      : isIntraPlant || false,
        siteId            : siteId || null,
        blockId           : blockId || null,
        sourceSiteId      : user.siteId || null,
        sourceBlockId     : user.blockId || null,
        destinationSiteId   : isIntraPlant? siteId : null,
        destinationBlockId  : isIntraPlant? blockId : null,
        purpose           : purpose || "Delivery",
        reason            :null,
        status            : "ORIGIN",
        loadStatus        : "pending",
        startedAt         : new Date(),
        completedAt       : null,
        waitingSince      :new Date(),
        materials: [
          {
            name      : req.body.materialType,
            material  : req.body.material || req.body.materialType,
            quantity  : req.body.quantity,
            invoiceNo : req.body.invoiceNo,
            unit      : req.body.unit,
            invoiceAmount: req.body.invoiceAmount,
            seal      : req.body.seal || "sealed",
            customer  : req.body.customer,
            supplier  : req.body.supplier || null
          }
        ],

        tripHistory: [
          {
            status            : "ORIGIN",
            location          : "inside_factory",
            phase             : "ORIGIN",
            actionBy          : user?.email || "system",
            actionLocation    : user?.workLocation,
            factoryId         : user.factory?._id || null,
            action            : "begin",
            actionDetails: {
              siteId          : user?.siteId || null,
              blockId         : user?.blockId || null
            },
            timestamp         : new Date(),
            segment: {
              movementType    : "internal",
              sourceFactoryId : user.factory?._id || null,
              destinationFactoryId: isIntraPlant? user.factory?._id : destinationFactoryId || null,
              startedAt       : new Date(),
              completedAt     : null
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

// ======================== UPDATE VEHICLE TRIP DETAILS (WITHIN A 15-MINUTE WINDOW) ========================
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

// ======================== CHECKIN VEHICLE AT DESTINATION ========================
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

      const history = [
        {
          status: trip.status,
          location: "inside_factory",
          phase: "DESTINATION",
          actionBy: user?.email || "system",
          actionDetails: {
              siteId: user?.siteId || null,
              blockId: user?.blockId || null
            },
          actionLocation: user?.workLocation,
          factoryId: trip.destinationFactoryId || null,
          action: "checkin",
          timestamp: new Date(),
          waitingSince: new Date(),
        }
      ];

      if (req.body.isIntraPlant || trip.isIntraPlant) {
        history.push({
          status: trip.status,
          location: "inside_factory",
          phase: "DESTINATION",
          actionBy: user?.email || "system",
          actionLocation: user?.workLocation,
          factoryId: trip.destinationFactoryId || null,
          action: "intra_plant_checkin",
          timestamp: new Date(),
          waitingSince: new Date(),
        });
      }

      updatedTrip = await Trip.findByIdAndUpdate(
          tripId,
          {
            location: "inside_factory",
            checkedInAt: new Date(),
            tripState: "ACTIVE",
            currentFactoryId: trip.destinationFactoryId || null,
            isIntraPlant: req.body.isIntraPlant || trip.isIntraPlant || false,
            siteId: req.body.siteId || trip.siteId || null,
            blockId: req.body.blockId || trip.blockId || null,
            $push: {
              tripHistory: {
                $each: history
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

// ======================== UNLOAD VEHICLE ========================
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

      // const workflow = computeWorkflow(trip, [user.factory], user, getTripPhase(trip));
      // checkAuthorizedAction(user, workflow);
      

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
                actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
                actionLocation: user?.workLocation,
                factoryId: trip.destinationFactoryId || user.factory._id || null,
                action: "unload",
                timestamp: new Date(),
                waitingSince: new Date(),
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

// ======================== COMPLETE LOAD STATUS OF THE TRIP ========================
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
                actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
                actionLocation: user?.workLocation,
                factoryId:trip.destinationFactoryId || null,
                action: "complete",
                timestamp: new Date(),
                waitingSince: new Date(),
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

// ======================== CHECKOUT AND DISPATCH THE VEHICLE FOR DESTINATION FACTORY ========================
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
    const updatedTrip = await Trip.findByIdAndUpdate(
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
              actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
              actionLocation: user?.workLocation,
              factoryId:user?.factory?._id || null,
              action: "checkout",
              timestamp: new Date(),
              waitingSince: null,
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

// ======================== CLOSE THE EXTERNAL TRIP AND RELEASE DRIVER & VEHICLE ========================
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
            waitingSince: null,
            $push: {
              tripHistory: {
                status: "DESTINATION",
                location: "outside_factory",
                phase: "DESTINATION",
                actionBy: user?.email || "system",
                actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
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

// ======================== MARK ARRIVED ========================
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
          location: trip.isIntraPlant ? "inside_factory" : "outside_factory",
          status: "ARRIVED",
          phase: "DESTINATION",
          arrivedAt: new Date(), 
          waitingSince: new Date(),
          currentFactoryId: trip.destinationFactoryId || null,
          $push: {
            tripHistory: {
              status: "ARRIVED",
              location: trip.isIntraPlant ? "inside_factory" : "outside_factory",
              phase: "DESTINATION",
              actionBy: user?.email || "system",
              actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
              actionLocation: user?.workLocation,
              factoryId: trip.destinationFactoryId || null,
              currentFactoryId: trip.destinationFactoryId || null,
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

// ======================== CLOSE THE INTERNAL TRIP AND RELEASE DRIVER & VEHICLE ========================
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
      updatedTrip = await Trip.findByIdAndUpdate(
          tripId,
          {
            tripState: "CLOSED",
            status: "DESTINATION",
            completedAt: now,
            waitingSince: null,
            $push: {
              tripHistory: {
                status: "DESTINATION",
                phase: "DESTINATION",
                actionBy: user?.email || "system",
                actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
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
        const updateSegment = await tripSegment.findByIdAndUpdate(
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

// ======================== MARK LOAD COMPLETE AT DESTINATION ========================
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
        // !tripDetails.materialType ||
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
                actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
                actionLocation: user?.workLocation,
                factoryId: existingTrip.destinationFactoryId || null,
                action: "load",
                timestamp: new Date(),
                waitingSince: new Date(),
                details: {
                  material: tripDetails.material,
                  quantity: tripDetails.quantity,
                  invoiceNo: tripDetails.invoiceNo,
                  invoiceAmount: tripDetails.invoiceAmount,
                  customer: tripDetails.customer,
                },
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

// ======================== CANCEL TRIP ========================
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
            waitingSince: null,
            $push: {
              tripHistory: {
                status: "CANCELLED",
                location: trip.location,
                phase: trip.phase,
                actionBy: user?.email || "system",
                actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
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
      isPaused: false,
      alertSubscriptions: "tripCancelled"
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

// ======================== CHANGE ROUTE ========================
export const changeRoute = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let tripDetails = null;

  try {
    await session.withTransaction(async () => {
      const { tripId } = req.params;
      const { newDestinationFactoryId, newSiteId, newBlockId, customer, type, skipCheckin } = req.body;

      const user = await User.findById(req.userId).populate("factory").session(session);
      if (!user?.factory) {
        throw new AppError("Your session expired. Please login again.", 400);
      }

      const trip = await Trip.findById(tripId).session(session);
      if (!trip) {
        throw new AppError("Trip maybe closed or not available", 404);
      }

      if (["CLOSED", "CANCELLED"].includes(trip.tripState)) {
        throw new AppError("Cannot change route of a closed or cancelled trip", 400);
      }

      // ========================
      // LOCATION GUARD
      // Allowed: inside the factory (existing rule) OR before check-in (new rule)
      // ========================
      const ROUTE_CHANGE_ALLOWED_LOCATIONS = ["inside_factory", "outside_factory"];
      if (!ROUTE_CHANGE_ALLOWED_LOCATIONS.includes(trip.location)) {
        throw new AppError(
          "Route can only be changed before check-in or from inside the factory",
          400
        );
      }

      // ========================
      // VALIDATION
      // ========================
      if (type === "internal" && !newDestinationFactoryId) {
        throw new AppError("New destination factory is required for internal transfer", 400);
      }
      if (type === "external" && !customer) {
        throw new AppError("Customer is required for external movement", 400);
      }
      if (type === "internal" && String(trip.destinationFactoryId) === String(newDestinationFactoryId)) {
        throw new AppError("Vehicle is already at this factory.", 400);
      }

      const now = new Date();

      // Before check-in there is no "inside" step, so always go straight to in-transit.
      // Same trip state that checkoutVehicle produces.
      const isSkip = !!skipCheckin || trip.location === "outside_factory";

      const destinationFactoryId =
        type === "intraplant" && trip.isIntraPlant === true
          ? user.factory._id
          : newDestinationFactoryId || null;

      // ========================
      // UPDATE PAYLOAD
      // phase stays "ORIGIN" in both paths: getStage (IN_TRANSIT / READY_FOR_ARRIVAL)
      // and the "enroute" / "dispatched" filters all require it.
      // ========================
      const updatePayload = {
        type: type === "external" ? "external_delivery" : "internal_transfer",
        purpose: isSkip? trip.purpose : trip.loadStatus === "loaded" && trip.purpose === "Pickup" ? "Delivery" : trip.purpose,
        loadStatus: trip.loadStatus === "loaded" ? "pending" : trip.loadStatus,
        currentFactoryId: user.factory._id,
        externalDestination: type === "external" ? customer : null,
        sourceFactoryId: user.factory._id,
        destinationFactoryId,
        phase: "ORIGIN",
        location: isSkip ? "enroute" : "inside_factory",
        status: isSkip ? "IN_TRANSIT" : "ROUTE_CHANGED",
        startedAt: now,
        waitingSince: isSkip ? null : now,
      };

      if (trip.isIntraPlant) {
        updatePayload.siteId = user.siteId || null;
        updatePayload.blockId = user.blockId || null;
        updatePayload.sourceSiteId = user.siteId || null;
        updatePayload.sourceBlockId = user.blockId || null;
        updatePayload.destinationSiteId = newSiteId || null;
        updatePayload.destinationBlockId = newBlockId || null;
      }

      // ========================
      // HISTORY (single route_change entry)
      // ========================
      const historyEntry = {
        status: "ROUTE_CHANGED",
        phase: "ROUTE_UPDATE",
        actionBy: user.email || "system",
        actionDetails: {
          siteId: user.siteId || null,
          blockId: user.blockId || null,
        },
        actionLocation: user.workLocation,
        location: trip.location || null,
        factoryId: user.factory._id,
        action: "route_change",
        timestamp: now,
        segment: {
          movementType: type,
          externalDestination: type === "internal" ? null : customer,
          sourceFactoryId: trip.destinationFactoryId, // factory the vehicle had arrived at
          destinationFactoryId,                       // new factory
          startedAt: trip.startedAt,
          completedAt: now,
        },
      };

      const updatedTrip = await Trip.findByIdAndUpdate(
        tripId,
        { ...updatePayload, $push: { tripHistory: historyEntry } },
        { new: true, session }
      );

      // ========================
      // SEGMENTS (inside the transaction)
      // ========================
      if (trip.currentSegment) {
        await tripSegment.findByIdAndUpdate(
          trip.currentSegment,
          { status: "CLOSED", completedAt: now },
          { session }
        );
      }

      const segmentCount = await tripSegment
        .countDocuments({ tripId: updatedTrip._id })
        .session(session);

      const [newSegment] = await tripSegment.create(
        [
          {
            tripId: updatedTrip._id,
            triptype: updatedTrip.type === "internal_transfer" ? "INTERNAL" : "EXTERNAL",
            purpose:  updatedTrip.purpose,
            status: "ACTIVE",
            segmentNumber: segmentCount + 1,
            materials: updatedTrip.materials?.[0],
            externalSource: updatedTrip.externalSource ?? null,
            externalDestination: updatedTrip.externalDestination ?? null,
            sourceFactoryId: updatedTrip.sourceFactoryId ?? null,
            destinationFactoryId: updatedTrip.destinationFactoryId ?? null,
            vehicleId: updatedTrip.vehicleId,
            driverId: updatedTrip.driverId,
            startedAt: updatedTrip.startedAt,
            completedAt: null,
          },
        ],
        { session }
      );

      updatedTrip.currentSegment = newSegment._id;
      await updatedTrip.save({ session });

      tripDetails = {
        trip: updatedTrip,
        success: true,
        message: "Route Changed Successfully.",
      };
    });
  } finally {
    session.endSession();
  }

  return res.status(200).json(tripDetails);
});

// ======================== LOAD MATERIAL AND CREATE NEW TRIP ========================
export const loadMaterialAndNewtrip = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let responseData = null;

  try {
    await session.withTransaction(async () => {

      const { tripId } = req.params;
      const { newTripDetails } = req.body;
      const isIntra = newTripDetails?.type === "intraplant";

      const user = await User.findById(req.userId)
        .populate("factory")
        .session(session);

      if (!user) {
        throw new AppError("Please login to continue", 400);
      }

      // Only applies to internal-factory transfers, not intra-plant or external
      if (
        !isIntra &&
        newTripDetails?.shipmentType === "internal" &&
        user?.factory?._id?.toString() === newTripDetails?.newDestinationFactoryId?.toString()
      ) {
        throw new AppError(
          "You cannot select your current factory as Destination",
          400
        );
      }

      const currentTrip = await Trip.findById(tripId).session(session);

      if (!currentTrip) {
        throw new AppError("Trip not found", 404);
      }

      if (currentTrip.tripState === "COMPLETED") {
        throw new AppError("Trip already completed", 400);
      }

      if (currentTrip.location !== "inside_factory") {
        throw new AppError(
          "Vehicle must be inside factory to load material",
          400
        );
      }

      if (isIntra && !newTripDetails?.newSiteId) {
        throw new AppError("Destination site is required for intra-plant movement", 400);
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
            waitingSince: null
          },
          $push: {
            tripHistory: {
              status: currentTrip.status,
              location: currentTrip.location,
              phase: "DESTINATION",
              actionBy: user?.email || "system",
              actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
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
      const newTripPayload = {
        purpose: "Delivery",
        phase: "ORIGIN",
        location: "inside_factory",
        status: "ORIGIN",
        tripState: "ACTIVE",
        loadStatus: "pending",
        waitingSince: new Date(),

        vehicleId: currentTrip.vehicleId,
        driverId: currentTrip.driverId,
        currentFactoryId: user?.factory._id,

        materials: [
          {
            name: newTripDetails.materialType ?? currentTrip.materials[0]?.name ?? "",
            material: newTripDetails.material ?? "",
            quantity: newTripDetails.quantity ?? 0,
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
            actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
            actionLocation: user.workLocation,
            factoryId: user.factory._id,
            action: "begin",
            timestamp: new Date(),
          }
        ],
      };

      if (isIntra) {
        // Intra-plant: same factory both ends, site/block define the move
        Object.assign(newTripPayload, {
          type: "internal_transfer",
          isIntraPlant: true,
          sourceFactoryId: user.factory._id,
          destinationFactoryId: user.factory._id,
          sourceSiteId: currentTrip.destinationSiteId || currentTrip.siteId || null,
          sourceBlockId: currentTrip.destinationBlockId || currentTrip.blockId || null,
          destinationSiteId: newTripDetails.newSiteId,
          destinationBlockId: newTripDetails.newBlockId || null,
        });
      } else {
        Object.assign(newTripPayload, {
          type: newTripDetails.shipmentType === "internal" ? "internal_transfer" : "external_delivery",
          isIntraPlant: false,
          sourceFactoryId: user.factory._id,
          destinationFactoryId: newTripDetails.shipmentType === "internal" ? newTripDetails.newDestinationFactoryId : undefined,
          externalDestination: newTripDetails.shipmentType === "external" ? newTripDetails.externalDestination : undefined,
        });
      }

      const newTrip = await Trip.create([newTripPayload], { session });

      const driverUpdate = {};
      if (currentTrip.driverId) {
        driverUpdate.activeTripId = newTrip[0]._id;
      }

      await Driver.findByIdAndUpdate(
        currentTrip.driverId,
        { $set: driverUpdate },
        { session }
      );

      await Vehicle.findByIdAndUpdate(
        currentTrip.vehicleId,
        { currentTrip: newTrip[0]._id },
        { session }
      );

      const segmentId = updatedTrip.currentSegment;

      if (segmentId) {
        await tripSegment.findByIdAndUpdate(segmentId, {
          status: "CLOSED",
          completedAt: new Date()
        }, {
          new: true,
          session
        });
      }

      const newSegment = await tripSegment.create([{
        tripId: newTrip[0]._id,
        triptype: newTrip[0].type === "internal_transfer" ? "INTERNAL" : "EXTERNAL",
        segmentNumber: 1,
        purpose: newTrip[0].purpose,
        materials: newTrip[0].materials[0],
        externalSource: newTrip[0].externalSource ?? null,
        externalDestination: newTrip[0].externalDestination ?? null,
        sourceFactoryId: newTrip[0].sourceFactoryId ?? null,
        destinationFactoryId: newTrip[0].destinationFactoryId ?? null,
        vehicleId: newTrip[0].vehicleId,
        driverId: newTrip[0].driverId,
        startedAt: newTrip[0].startedAt,
        completedAt: null,
      }], { session });

      newTrip[0].currentSegment = newSegment[0]._id;
      await newTrip[0].save({ session });

      responseData = {
        success: true,
        trip: updatedTrip,
        newTrip: newTrip[0],
        message: "Material loaded, current trip closed, and new trip created successfully"
      };

    });

  } catch (err) {
    console.error("Error in loadMaterialAndNewtrip:", err);
    throw new AppError(err.message, 500);
  } finally {
    session.endSession();
  }
  return res.status(200).json(responseData);
});

// ------------------------ INTRA PLANT TRIPS CONTROLLERS ------------------------

export const dispatchVehicle = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { tripId } = req.params;

    const user = await User.findById(req.userId)
      .populate("factory")
      .session(session);

    if (!user) {
      throw new AppError("Please login to continue.", 401);
    }

    const trip = await Trip.findById(tripId).session(session);

    if (!trip) {
      throw new AppError("Trip not found.", 404);
    }

    // ---------- Validation ----------

    if (["CLOSED", "CANCELLED"].includes(trip.tripState)) {
      throw new AppError(
        `Cannot dispatch a ${trip.tripState.toLowerCase()} trip.`,
        400
      );
    }

    if (trip.location !== "inside_factory") {
      throw new AppError(
        "Vehicle must be inside the factory before dispatch.",
        400
      );
    }

    const now = new Date();

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        $set: {
          location: "enroute",
          status: "IN_TRANSIT",
          phase: "ORIGIN",
          dispatchedAt: now,
          waitingSince: null,
        },

        $push: {
          tripHistory: {
            status: "IN_TRANSIT",
            location: "enroute",
            phase: "ORIGIN",
            action: "dispatched",
            actionBy: user.email,
            actionDetails: {
                  siteId: user?.siteId || null,
                  blockId: user?.blockId || null
                },
            actionLocation: user.workLocation,
            factoryId: trip.sourceFactoryId,
            timestamp: now,
          },
        },
      },
      {
        new: true,
        session,
      }
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Vehicle dispatched successfully.",
      trip: updatedTrip,
    });

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});



// ========================
// GET VEHICLE TRIPS
// ========================

const lst36hr = new Date(Date.now() - 36 * 60 * 60 * 1000);

function applyTripAccess(matchQuery, user) {
  const userSiteId  = user.siteId  || null;
  const userBlockId = user.blockId || null;

  const accessFilter = {
    $or: [
      // Non-intra-plant trips: visible to everyone at the factory (factory scope already applied in matchQuery)
      { isIntraPlant: { $ne: true } },
    ],
  };

  // Intra-plant trips: user must be tied to the source OR destination site
  if (userSiteId) {
    const intraAnd = [
      { isIntraPlant: true },
      {
        $or: [
          { sourceSiteId: userSiteId },
          { destinationSiteId: userSiteId },
        ],
      },
    ];

    // Block is a HARD requirement, but only enforced when the user has a block assigned
    if (userBlockId) {
      intraAnd.push({
        $or: [
          { sourceBlockId: userBlockId },
          { destinationBlockId: userBlockId },
        ],
      });
    }

    accessFilter.$or.push({ $and: intraAnd });
  }

  return {
    $and: [matchQuery, accessFilter],
  };
}

// Decides, for intra-plant trips, whether the trip is "arriving at" or "leaving from" this user's site/block
const intraSiteBlockMatch = (siteField, blockField, user) => ({
  isIntraPlant: true,
  [siteField]: user.siteId,
  ...(user.blockId ? { [blockField]: user.blockId } : {}),
});

// ------------- GET SINGLE TRIP CLILCKED ON TRIP CARD IN VEHICLE PAGE ----------
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
            { sourceFactoryId: factoryId },
            { currentFactoryId: factoryId }
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
          localField: "currentFactoryId",
          foreignField: "_id",
          as: "currentFactory"        //  renamed
        }
      },
      {
        $unwind: {
          path: "$currentFactory",
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
        $lookup: {
          from: "sites",
          localField: "tripHistory.actionDetails.siteId",
          foreignField: "_id",
          as: "tripHistorySites"
        }
      },
      {
        $lookup: {
          from: "blocks",
          localField: "tripHistory.actionDetails.blockId",
          foreignField: "_id",
          as: "tripHistoryBlocks"
        }
      },
      {
        $lookup: {
          from: "sites",
          localField:"siteId",
          foreignField:"_id",
          as:"site"
        }
      },
      {
        $unwind:{
          path: "$site",
          preserveNullAndEmptyArrays: true
        }
      },
        {
          $lookup: {
            from: "blocks",
            localField:"blockId",
            foreignField:"_id",
            as:"block"
          }
        },
        {
          $unwind:{
            path: "$block",
            preserveNullAndEmptyArrays: true
          }
        },
        
        {
          $lookup: {
            from: "sites",
            localField: "sourceSiteId",
            foreignField: "_id",
            as: "sourceSite",
          },
        },
        {
          $lookup: {
            from: "sites",
            localField: "destinationSiteId",
            foreignField: "_id",
            as: "destinationSite",
          },
        },
        {
          $lookup: {
            from: "blocks",
            localField: "sourceBlockId",
            foreignField: "_id",
            as: "sourceBlock",
          },
        },
        {
          $lookup: {
            from: "blocks",
            localField: "destinationBlockId",
            foreignField: "_id",
            as: "destinationBlock",
          },
        },

        {
          $unwind: {
            path: "$sourceSite",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$destinationSite",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$sourceBlock",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$destinationBlock",
            preserveNullAndEmptyArrays: true,
          },
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

                    actionDetails: {
                      $cond: [
                        { $ifNull: ["$$history.actionDetails", false] },
                        {
                          $mergeObjects: [
                            "$$history.actionDetails",
                            {
                              site: {
                                $cond: [
                                  { $ifNull: ["$$history.actionDetails.siteId", false] },
                                  {
                                    $arrayElemAt: [
                                      {
                                        $filter: {
                                          input: "$tripHistorySites",
                                          as: "s",
                                          cond: { $eq: ["$$s._id", "$$history.actionDetails.siteId"] }
                                        }
                                      },
                                      0
                                    ]
                                  },
                                  null
                                ]
                              },
                              block: {
                                $cond: [
                                  { $ifNull: ["$$history.actionDetails.blockId", false] },
                                  {
                                    $arrayElemAt: [
                                      {
                                        $filter: {
                                          input: "$tripHistoryBlocks",
                                          as: "b",
                                          cond: { $eq: ["$$b._id", "$$history.actionDetails.blockId"] }
                                        }
                                      },
                                      0
                                    ]
                                  },
                                  null
                                ]
                              }
                            }
                          ]
                        },
                        "$$history.actionDetails"
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
                                      cond: { $eq: ["$$sf._id", "$$history.segment.sourceFactoryId"] }
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
                                      cond: { $eq: ["$$df._id", "$$history.segment.destinationFactoryId"] }
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
          isIntraPlant: 1,  
          siteId: 1,
          blockId: 1,
          sourceSiteId: 1,
          sourceBlockId: 1,
          destinationSiteId: 1,
          destinationBlockId: 1,
          sourceSite: 1,      
          destinationSite: 1,  
          sourceBlock: 1,   
          destinationBlock: 1,
          site: 1,
          block: 1,
          sourceFactoryId: 1,
          tripHistory: 1,
          materials: 1,
          destinationFactory: 1,
          currentFactoryId: 1,
          currentFactory: 1,
          completedAt:1,
          waitingSince: 1,
          currentSegment: 1,
          destinationFactoryId: 1,
          createdAt: 1,
          updatedAt: 1,
        }
      },

      { $sort: { createdAt: -1 } }
    ]);

    if (!trips.length) {
        return res.status(404).json({
            success: false,
            message: "Trip not found"
        });
    }

    const sites = await Site.find({_id: { $in: user?.factory?.allowedSites }});
    const currentPhase = getTripPhase(trips[0], user, sites);
    const workflow = computeWorkflow(trips[0], sites, user, currentPhase);


    return res.json({...trips[0], workflow, success: true, message: "Trip fetched successfully"});

  } catch (err) {
    console.error("Error fetching vehicle trips:", err);
    return res.status(400).json({ error: err.message });
  }
};

// ------------- GET ALL LIVE TRIPS FOR VEHICLES IN THIS FACTORY (ACTIVE + COMPLETED) ----------
export const getLiveVehicleTrips = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    .populate("factory", "isIntraPlant")
    .select("factory siteId blockId")
    .lean();  

    if (!user || !user.factory) {
      return res.status(404).json({
        success: false,
        message: "User factory not found"
      });
    }

    const factoryId = user.factory._id;
    const page      = Number(req.query.page)  || 1;
    const limit     = Number(req.query.limit) || 20;
    const skip      = (page - 1) * limit;
    const filter    = req.query.filter || "all";   // <-- new
    const search    = req.query.search?.trim() || "";  // new


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
            currentFactoryId: factoryId,
            $or: [
              { sourceFactoryId:      factoryId },
              { destinationFactoryId: factoryId },
            ],
          };
        break;

      case "waiting":
        matchQuery = {
          tripState: { $in: ["ACTIVE", "COMPLETED"] },
          location:  "outside_factory",
          phase:     "DESTINATION",
          $or: [
            { isIntraPlant: { $ne: true }, destinationFactoryId: factoryId },
            intraSiteBlockMatch("destinationSiteId", "destinationBlockId", user),
          ],
        };
        break;

      case "inside":
        matchQuery = {
          tripState: { $in: ["ACTIVE", "COMPLETED"] },
          location:  "inside_factory",
          $or: [
            // non-intra
            { isIntraPlant: { $ne: true }, phase: "ORIGIN",      sourceFactoryId:      factoryId },
            { isIntraPlant: { $ne: true }, phase: "DESTINATION", destinationFactoryId: factoryId },
            // intra
            { phase: "ORIGIN",      ...intraSiteBlockMatch("sourceSiteId",      "sourceBlockId",      user) },
            { phase: "DESTINATION", ...intraSiteBlockMatch("destinationSiteId", "destinationBlockId", user) },
          ],
        };
        break;

      case "enroute":
        matchQuery = {
          tripState: { $in: ["ACTIVE", "COMPLETED"] },
          location:  "enroute",
          $or: [
            { isIntraPlant: { $ne: true }, destinationFactoryId: factoryId },
            intraSiteBlockMatch("destinationSiteId", "destinationBlockId", user),
          ],
        };
        break;

      case "dispatched":
        matchQuery = {
          tripState: { $in: ["ACTIVE", "COMPLETED"] },
          location:  "enroute",
          status:    "IN_TRANSIT",
          phase:     "ORIGIN",
          $or: [
            { isIntraPlant: { $ne: true }, sourceFactoryId: factoryId },
            intraSiteBlockMatch("sourceSiteId", "sourceBlockId", user),
          ],
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

    matchQuery = applyTripAccess(matchQuery, user);

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
          arrivedAt   checkedInAt   externalSource   externalDestination
          materials   createdAt   startedAt   completedAt      updatedAt
          vehicleId   driverId    sourceFactoryId   destinationFactoryId 
          isIntraPlant  siteId  blockId   sourceSiteId destinationSiteId 
          sourceBlockId destinationBlockId currentFactoryId currentSegment
        `)
        .populate({ path: "vehicleId",            select: "vehicleNumber type typeOfVehicle transporterName PUCExpiry" })
        .populate({ path: "driverId",             select: "driverName driverContact" })
        .populate({ path: "sourceFactoryId",      select: "name location" })
        .populate({ path: "destinationFactoryId", select: "name location" })
        .populate({ path: "siteId",               select: "name status allowedBlocks"})
        .populate({ path: "blockId",              select: "name "})
        .populate({ path: "sourceSiteId",         select: "name"})
        .populate({ path: "destinationSiteId",    select: "name"})
        .populate({ path: "sourceBlockId",        select: "name"})
        .populate({ path: "destinationBlockId",   select: "name"})
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Trip.countDocuments(matchQuery),
    ]);

    
    
    // ── Format ────────────────────────────────────────────────────────────────
    const sites = await Site.find({_id: { $in: user?.factory?.allowedSites }});
    const currentPhase = getTripPhase(trips, user, sites);

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
      isIntraPlant:         trip.isIntraPlant,
      createdAt:           trip.createdAt,
      startedAt:           trip.startedAt,
      completedAt:         trip.completedAt,
      updatedAt:           trip.updatedAt,

      site: trip.siteId ? {
      _id:    trip.siteId._id,
      name:   trip.siteId.name,
      status: trip.siteId.status,
      allowedBlocks: trip.siteId.allowedBlocks
      } : null,
      
      block: trip.blockId ? {
        _id: trip.blockId._id,
        name: trip.blockId.name
      } : null,

      sourceSite: trip.sourceSiteId,
      destinationSite: trip.destinationSiteId,
      sourceBlock: trip.sourceBlockId,
      destinationBlock: trip.destinationBlockId,

      sourceSiteId: trip.sourceSiteId?._id,
      sourceBlockId: trip?.sourceBlockId?._id,
      destinationSiteId: trip.destinationSiteId?._id,
      destinationBlockId: trip.destinationBlockId?._id,

      vehicle: trip.vehicleId ? {
        _id:             trip.vehicleId._id,
        vehicleNumber:   trip.vehicleId.vehicleNumber,
        transporterName: trip.vehicleId.transporterName || null,
        vehicleType:     trip.vehicleId.type,
        typeOfVehicle:   trip.vehicleId.typeOfVehicle,
        PUCExpiry:   trip.vehicleId.PUCExpiry || null,
      } : null,

      driver: trip.driverId ? {
        _id:   trip.driverId._id,
        name:  trip.driverId.driverName,
        phone: trip.driverId.driverContact,
      } : null,

      currentFactoryId: trip.currentFactoryId,

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
      workflow: computeWorkflow(trip, sites, user, currentPhase),
    }));

    

    // const workflow = computeWorkflow(trips[0], sites, user, currentPhase);


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


// Get vehicle counts for dashboard cards (all, inside, outside, enroute, dispatched, closed, pickup, delivery, FG, RM)
export const getVehiclesLength = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("factory siteId blockId")
      .lean();

    const factoryId  = user?.factory;
    const userSiteId  = user?.siteId  || null;
    const userBlockId = user?.blockId || null;

    // For intra-plant trips: does source-or-destination site/block match this user?
    const intraSiteBlockMatch = (siteField, blockField) => ({
      isIntraPlant: true,
      ...(userSiteId ? { [siteField]: userSiteId } : { _id: null }), // no siteId → user matches nothing intra
      ...(userBlockId ? { [blockField]: userBlockId } : {}),
    });

    // Visibility filter for "all factory" style counts (total, closed):
    // non-intra trips visible factory-wide; intra trips only if user's site (and block, if set) is on either side
    const intraVisibility = userSiteId
      ? {
          isIntraPlant: true,
          $or: [
            { sourceSiteId: userSiteId },
            { destinationSiteId: userSiteId },
          ],
          ...(userBlockId
            ? {
                $and: [
                  {
                    $or: [
                      { sourceBlockId: userBlockId },
                      { destinationBlockId: userBlockId },
                    ],
                  },
                ],
              }
            : {}),
        }
      : { isIntraPlant: true, _id: null }; // no siteId → no intra trips visible

    const factoryOrIntraVisible = (factoryOrClause) => ({
      $or: [
        { isIntraPlant: { $ne: true }, $or: factoryOrClause },
        intraVisibility,
      ],
    });

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

      // All — factory-wide for non-intra, site/block-scoped for intra
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        location:  { $nin: ["enroute"] },
        $or:[
          {phase: "ORIGIN", sourceFactoryId: factoryId},
          {phase: "DESTINATION", destinationFactoryId: factoryId}
        ],
        ...factoryOrIntraVisible([{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }]),
      }),

      // Inside — direction matters: ORIGIN side or DESTINATION side must match
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        location:  "inside_factory",
        $or: [
          { isIntraPlant: { $ne: true }, phase: "ORIGIN",      sourceFactoryId:      factoryId },
          { isIntraPlant: { $ne: true }, phase: "DESTINATION", destinationFactoryId: factoryId },
          { phase: "ORIGIN",      ...intraSiteBlockMatch("sourceSiteId",      "sourceBlockId") },
          { phase: "DESTINATION", ...intraSiteBlockMatch("destinationSiteId", "destinationBlockId") },
        ],
      }),

      // Waiting/Outside — destination side only
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        location:  "outside_factory",
        phase:     "DESTINATION",
        $or: [
          { isIntraPlant: { $ne: true }, destinationFactoryId: factoryId },
          intraSiteBlockMatch("destinationSiteId", "destinationBlockId"),
        ],
      }),

      // Upcoming/enroute — destination side only
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        location:  "enroute",
        phase:     "ORIGIN", // kept as in your original — verify this is intended vs "DESTINATION"
        $or: [
          { isIntraPlant: { $ne: true }, destinationFactoryId: factoryId },
          intraSiteBlockMatch("destinationSiteId", "destinationBlockId"),
        ],
      }),

      // Dispatched — source side only
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        location:  "enroute",
        status:    "IN_TRANSIT",
        phase:     "ORIGIN",
        $or: [
          { isIntraPlant: { $ne: true }, sourceFactoryId: factoryId },
          intraSiteBlockMatch("sourceSiteId", "sourceBlockId"),
        ],
      }),

      // Closed/Cancelled — factory-wide for non-intra, site/block for intra
      Trip.countDocuments({
        tripState:   { $in: ["CLOSED", "CANCELLED"] },
        completedAt: { $gte: lst36hr },
        ...factoryOrIntraVisible([{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }]),
      }),

      // Pickup — factory-wide visibility scope, same as "all"
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        purpose:   "Pickup",
        ...factoryOrIntraVisible([{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }]),
      }),

      // Delivery
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        purpose:   "Delivery",
        $or: [
          { location: "outside_factory", phase: "DESTINATION", destinationFactoryId: factoryId },
          { location: "inside_factory",  $or: [
              { phase: "ORIGIN",      sourceFactoryId:      factoryId },
              { phase: "DESTINATION", destinationFactoryId: factoryId },
            ]
          },
        ],
        ...factoryOrIntraVisible([{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }]),
      }),

      // FG — inside_factory scope, direction-aware
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        $or: [{ "materials.0.material": "FG" }, { "materials.0.name": "FG" }],
        $and: [
          {
            $or: [
              { isIntraPlant: { $ne: true }, phase: "ORIGIN",      location: "inside_factory", sourceFactoryId:      factoryId },
              { isIntraPlant: { $ne: true }, phase: "DESTINATION", location: "inside_factory", destinationFactoryId: factoryId },
              { phase: "ORIGIN",      location: "inside_factory", ...intraSiteBlockMatch("sourceSiteId",      "sourceBlockId") },
              { phase: "DESTINATION", location: "inside_factory", ...intraSiteBlockMatch("destinationSiteId", "destinationBlockId") },
            ],
          },
        ],
      }),

      // RM — waiting ∪ inside ∪ enroute scope, direction-aware
      Trip.countDocuments({
        tripState: { $in: ["ACTIVE", "COMPLETED"] },
        $or: [{ "materials.0.material": "RM" }, { "materials.0.name": "RM" }],
        $and: [
          {
            $or: [
              { isIntraPlant: { $ne: true }, location: "outside_factory", phase: "DESTINATION", destinationFactoryId: factoryId },
              { isIntraPlant: { $ne: true }, location: "inside_factory",  phase: "ORIGIN",       sourceFactoryId:      factoryId },
              { isIntraPlant: { $ne: true }, location: "inside_factory",  phase: "DESTINATION",  destinationFactoryId: factoryId },
              { isIntraPlant: { $ne: true }, location: "enroute",         destinationFactoryId: factoryId },
              { location: "outside_factory", phase: "DESTINATION", ...intraSiteBlockMatch("destinationSiteId", "destinationBlockId") },
              { location: "inside_factory",  phase: "ORIGIN",      ...intraSiteBlockMatch("sourceSiteId",      "sourceBlockId") },
              { location: "inside_factory",  phase: "DESTINATION", ...intraSiteBlockMatch("destinationSiteId", "destinationBlockId") },
              { location: "enroute",         ...intraSiteBlockMatch("destinationSiteId", "destinationBlockId") },
            ],
          },
        ],
      }),
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

  } catch (er) {
    console.log("something is wrong", er.message);
    return res.status(500).send(er.message);
  }
};

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

// Needs these in the trip controller file (add whatever is missing):
//   import mongoose from "mongoose";
//   import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
//   import Driver  from "../db/models/Driver-model/driver.model.js";

/* ── Search helpers ─────────────────────────────────────────────────────── */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const buildSearchMatch = async (rawTerm) => {
  const term = (rawTerm || "").trim();
  if (!term) return null;

  const or = [];

  if (OBJECT_ID_RE.test(term)) {
    const oid = new mongoose.Types.ObjectId(term);
    or.push({ _id: oid }, { vehicleId: oid }, { driverId: oid });
  } else {
    const compact = term.replace(/[\s-]/g, "");
    const vehicleRx = compact
      ? new RegExp(compact.split("").map(escapeRegExp).join("[\\s-]*"), "i")
      : null;
    const textRx = new RegExp(escapeRegExp(term), "i");

    const [vehicles, drivers] = await Promise.all([
      vehicleRx
        ? Vehicle.find({ vehicleNumber: vehicleRx }).select("_id").limit(500).lean()
        : [],
      Driver.find({
        $or: [
          { driverName: textRx },
          { driverContact: textRx },
          { licenseNumber: textRx },
        ],
      })
        .select("_id")
        .limit(500)
        .lean(),
    ]);

    if (vehicles.length) or.push({ vehicleId: { $in: vehicles.map((v) => v._id) } });
    if (drivers.length) or.push({ driverId: { $in: drivers.map((d) => d._id) } });
  }

  // Nothing matched → force an empty result instead of returning everything
  return or.length ? { $or: or } : { _id: { $in: [] } };
};

export const getClosedTrips = async (req, res) => {
  try {
    const { search, vehicleNumber, driverContact, from, to, cursor, limit } = req.query;

    const user = await User.findById(req.userId).select("factory");
    if (!user || !user.factory) {
      return res.status(404).json({ message: "User or factory not found" });
    }

    const factoryId = user.factory;
    const searchTerm = (search || "").trim();

    /* ── Pagination ─────────────────────────────────────────── */
    const PAGE_LIMIT = Math.min(parseInt(limit) || 20, 100);
    const cursorDate = cursor ? new Date(cursor) : null;

    /* ── Date range ─────────────────────────────────────────────
     * - explicit from/to  → use them
     * - searching, no dates → NO default window (search all time),
     *   otherwise an older vehicle/trip could never be found
     * - otherwise         → last 36 hours
     * ───────────────────────────────────────────────────────── */
    let fromDate;
    let toDate;

    if (from || to) {
      fromDate = from ? new Date(from) : null;
      toDate = to ? new Date(to) : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);
    } else if (!searchTerm) {
      toDate = new Date();
      fromDate = new Date(toDate.getTime() - 36 * 60 * 60 * 1000);
    }

    const statsDateFilter = {};
    if (fromDate) statsDateFilter.$gte = fromDate;
    if (toDate) statsDateFilter.$lte = toDate;

    const dataDateFilter = { ...statsDateFilter };
    if (cursorDate) dataDateFilter.$lt = cursorDate;

    /* ── Base matches ───────────────────────────────────────────
     * Factory scope is ALWAYS applied, even for ObjectId search, so a user
     * can't pull another factory's trips by guessing ids.
     * ───────────────────────────────────────────────────────── */
    const searchMatch = await buildSearchMatch(searchTerm);

    const factoryScope = {
      $or: [{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }],
    };
    const scope = searchMatch ? [factoryScope, searchMatch] : [factoryScope];

    const baseMatch = {
      tripState: { $in: ["CLOSED", "CANCELLED"] },
      ...(Object.keys(dataDateFilter).length && { updatedAt: dataDateFilter }),
      $and: scope,
    };

    const statsBaseMatch = {
      tripState: { $in: ["CLOSED", "CANCELLED"] },
      ...(Object.keys(statsDateFilter).length && { updatedAt: statsDateFilter }),
      $and: scope,
    };

    /* ── Legacy explicit filters (kept for other callers) ───── */
    const fieldMatch = {
      ...(vehicleNumber && {
        "vehicle.vehicleNumber": { $regex: escapeRegExp(vehicleNumber), $options: "i" },
      }),
      ...(driverContact && {
        "driver.driverContact": { $regex: escapeRegExp(driverContact), $options: "i" },
      }),
    };

    /* ── Shared lookup + project stages ─────────────────────── */
    const lookupStages = [
      { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "vehicle" } },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: false } },

      { $lookup: { from: "drivers", localField: "driverId", foreignField: "_id", as: "driver" } },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },

      ...(Object.keys(fieldMatch).length ? [{ $match: fieldMatch }] : []),

      { $lookup: { from: "factories", localField: "sourceFactoryId", foreignField: "_id", as: "sourceFactory" } },
      { $unwind: { path: "$sourceFactory", preserveNullAndEmptyArrays: true } },

      { $lookup: { from: "factories", localField: "destinationFactoryId", foreignField: "_id", as: "destinationFactory" } },
      { $unwind: { path: "$destinationFactory", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          type: 1,
          tripState: 1,
          startedAt: 1,
          updatedAt: 1,
          materials: 1,
          externalSource: 1,
          externalDestination: 1,

          "vehicle._id": 1,
          "vehicle.vehicleNumber": 1,
          "vehicle.type": 1,
          "vehicle.typeOfVehicle": 1,
          "vehicle.PUCExpiry": 1,

          "driver._id": 1,
          "driver.driverName": 1,
          "driver.driverContact": 1,
          "driver.driverIdType": 1,
          "driver.driverIdNumber": 1,
          "driver.licenseNumber": 1,

          "sourceFactory.name": 1,
          "sourceFactory.location": 1,
          "destinationFactory.name": 1,
          "destinationFactory.location": 1,
        },
      },

      { $sort: { updatedAt: -1 } },
    ];

    const dataPipeline = [
      { $match: baseMatch },
      ...lookupStages,
      { $limit: PAGE_LIMIT + 1 },
    ];

    const statsPipeline = [
      { $match: statsBaseMatch },
      ...lookupStages,
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          uniqueVehicles: { $addToSet: "$vehicle._id" },
          uniqueDrivers: { $addToSet: "$driver._id" },
          vehicleTripCounts: { $push: { vehicleNumber: "$vehicle.vehicleNumber", vehicleId: "$vehicle._id" } },
          driverTripCounts: { $push: { driverContact: "$driver.driverContact", driverName: "$driver.driverName", driverId: "$driver._id" } },
        },
      },
      {
        $addFields: {
          uniqueVehicleCount: { $size: "$uniqueVehicles" },
          uniqueDriverCount: { $size: "$uniqueDrivers" },
        },
      },
    ];

    const [dataResult, statsResult] = await Promise.all([
      Trip.aggregate(dataPipeline),
      !cursorDate ? Trip.aggregate(statsPipeline) : Promise.resolve([]),
    ]);

    const hasMore = dataResult.length > PAGE_LIMIT;
    const trips = hasMore ? dataResult.slice(0, PAGE_LIMIT) : dataResult;
    const nextCursor =
      hasMore && trips.length > 0 ? trips[trips.length - 1].updatedAt.toISOString() : null;

    // isDefault = the implicit 36h window was applied (not when searching)
    const isDefault = !(from || to || searchTerm);
    const dateRange = { from: fromDate ?? null, to: toDate ?? null, isDefault };

    if (trips.length === 0 && !cursorDate) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        stats: { totalTrips: 0, uniqueVehicleCount: 0, uniqueDriverCount: 0, perVehicle: [], perDriver: [] },
        pagination: { hasMore: false, nextCursor: null, limit: PAGE_LIMIT },
        dateRange,
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
        totalTrips: s.totalTrips,
        uniqueVehicleCount: s.uniqueVehicleCount,
        uniqueDriverCount: s.uniqueDriverCount,
        perVehicle,
        perDriver,
      };
    }

    return res.status(200).json({
      success: true,
      count: trips.length,
      data: trips,
      stats,
      pagination: { hasMore, nextCursor, limit: PAGE_LIMIT },
      dateRange,
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




// Trip downloading helpers and Excel-style formatting (Controller)

// ─────────────────────────────────────────────────────────────────────────────
// Keep your existing imports at the top of this file, they are all still used:
//   ExcelJS, mongoose, User, Trip, tripSegment
// ─────────────────────────────────────────────────────────────────────────────

/* ══════════════════════════════════════════════════════════════
   TIME HELPERS — the server runs in UTC, so every date/time is
   formatted explicitly in IST. (Before this, all times in the
   sheet were 5h30m behind what users saw in the app.)
══════════════════════════════════════════════════════════════ */
const APP_TZ = "Asia/Kolkata";

const fmtDT   = (d) => (d ? new Date(d).toLocaleString("en-IN", { hour12: true, timeZone: APP_TZ }) : "");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { timeZone: APP_TZ }) : "");
const ymdIST  = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: APP_TZ }); // YYYY-MM-DD

/** Start / end of the IST calendar day that contains `value` ("2026-10-15" or any ISO date). */
const istDayBoundary = (value, endOfDay) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const day = ymdIST(d);
  return new Date(`${day}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`);
};

const slug = (s) => String(s ?? "").trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ══════════════════════════════════════════════════════════════
   EXCEL STYLE HELPERS
══════════════════════════════════════════════════════════════ */

const COLORS = {
  headerBg:      "1E293B",
  headerFg:      "FFFFFF",
  colHeaderBg:   "F1F5F9",
  colHeaderFg:   "334155",
  seg1Bg:        "FFFFFF",
  seg2Bg:        "F8FAFC",
  multiMatBg:    "FFF7ED",
  routeChangeBg: "EFF6FF",
  evenRowBg:     "F8FAFC",
  cancelBg:      "FEF2F2",
  white:         "FFFFFF",
};

const styleHeader = (row, bgHex, fgHex) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgHex } };
    cell.font      = { bold: true, color: { argb: "FF" + fgHex }, name: "Arial", size: 9 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border    = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
  });
};

const styleData = (cell, bgHex) => {
  cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgHex } };
  cell.font      = { name: "Arial", size: 9 };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border    = {
    bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
    right:  { style: "hair", color: { argb: "FFE2E8F0" } },
  };
};

const styleRow = (row, bgHex) => row.eachCell({ includeEmpty: true }, (cell) => styleData(cell, bgHex));

/* ══════════════════════════════════════════════════════════════
   HISTORY HELPERS
══════════════════════════════════════════════════════════════ */

const isRouteChange = (ev) => ev.action?.toLowerCase() === "route_change";

/**
 * Place name for one end of a segment: the INTERNAL factory wins; the external
 * free-text name is used only when there is no internal factory on that side.
 * (Each side is resolved on its own — an external trip can be "external source
 * → internal destination" or the reverse, so the leg type must not decide.)
 */
const placeLabel = (factoryDoc, externalVal) =>
  factoryDoc?.name ||
  (typeof externalVal === "string" && externalVal.trim() ? externalVal.trim() : "");

const destLabel = (seg) => placeLabel(seg?.destinationFactory, seg?.externalDestination);

/**
 * Decide which segment every history event belongs to.
 *
 *  1. A route_change CLOSES the current segment: the route_change itself is the
 *     last event of the old segment, and everything after it (checkout, arrived,
 *     check-in ...) belongs to the NEXT segment. (The old code pulled the single
 *     event after a route_change into the old segment — that was wrong whenever
 *     that event was the checkout / arrival at the new destination.)
 *  2. If an event carries tripSegmentId and it points to a known segment that is
 *     not behind the current one, that id wins — no timing guesswork needed.
 *  3. Anything left over stays in the last segment (e.g. the final "closed").
 *
 * @returns {Array<Array>} one event array per segment, same order as `segments`
 */
function assignEventsToSegments(sortedHistory, segments) {
  const groups = segments.map(() => []);
  if (!segments.length) return groups;

  const idxById = new Map(segments.map((s, i) => [String(s._id), i]));
  const last = segments.length - 1;
  let cursor = 0;

  for (const ev of sortedHistory) {
    const hinted = ev.tripSegmentId ? idxById.get(String(ev.tripSegmentId)) : undefined;
    if (hinted !== undefined && hinted > cursor) cursor = hinted; // never move backwards

    groups[cursor].push(ev);

    if (isRouteChange(ev)) cursor = Math.min(cursor + 1, last);
  }
  return groups;
}

/**
 * Time of the first event matching any of the given actions. Used only for the
 * "closed" timestamp now; the timeline columns were removed from Trip Details.
 */
const eventTime = (events, ...actions) => {
  const want = actions.map((a) => a.toLowerCase());
  return events.find((ev) => want.includes(ev.action?.toLowerCase()))?.timestamp;
};

/* ══════════════════════════════════════════════════════════════
   CONTROLLER
══════════════════════════════════════════════════════════════ */

export const getDownloadTrips = async (req, res) => {
  try {
    const { from, to, factory } = req.query;

    const user = await User.findById(req.userId).select("factory isSystemAdmin").lean();

    if (!user?.factory && !user?.isSystemAdmin) {
      return res.status(404).json({ message: "User or factory not found" });
    }

    // Factory this report is for:
    //  • normal user / admin → the factory assigned to them (or the one they picked)
    //  • system admin        → the factory they picked, or ALL locations when none is picked
    let factoryId = user.factory || null;
    if (factory && mongoose.Types.ObjectId.isValid(factory)) {
      factoryId = new mongoose.Types.ObjectId(factory);
    }

    const Factory = mongoose.model("Factory");
    const factoryDoc = factoryId
      ? await Factory.findById(factoryId).select("name location").lean()
      : null;

    /* ── Date range (IST calendar days) ─────────────────────── */
    let fromDate, toDate;
    if (from || to) {
      fromDate = istDayBoundary(from, false);
      toDate   = istDayBoundary(to, true);
    } else {
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
          ...(factoryId && {
            $or: [{ sourceFactoryId: factoryId }, { destinationFactoryId: factoryId }],
          }),
        },
      },
      { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "vehicle" } },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: false } },
      { $lookup: { from: "drivers", localField: "driverId", foreignField: "_id", as: "driver" } },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
      { $sort: { updatedAt: -1 } },
    ]);

    if (!trips.length) {
      return res.status(404).json({ message: "No trips found for the given range." });
    }

    const tripIds = trips.map((t) => t._id);

    const rawSegments = await tripSegment.aggregate([
      { $match: { tripId: { $in: tripIds } } },
      { $lookup: { from: "vehicles", localField: "vehicleId", foreignField: "_id", as: "vehicle" } },
      { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "drivers", localField: "driverId", foreignField: "_id", as: "driver" } },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "factories", localField: "sourceFactoryId", foreignField: "_id", as: "sourceFactory" } },
      { $unwind: { path: "$sourceFactory", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "factories", localField: "destinationFactoryId", foreignField: "_id", as: "destinationFactory" } },
      { $unwind: { path: "$destinationFactory", preserveNullAndEmptyArrays: true } },
      { $sort: { tripId: 1, segmentNumber: 1 } },
    ]);

    const segmentsByTrip = new Map();
    for (const seg of rawSegments) {
      const key = seg.tripId.toString();
      if (!segmentsByTrip.has(key)) segmentsByTrip.set(key, []);
      segmentsByTrip.get(key).push(seg);
    }

    /* ── Factory names for the history log ────────────────────
       Trip.tripHistory only stores factory IDs (not populated by aggregate),
       which is why the "Factory" column of the Event Log was always empty. */
    const factoryIds = new Set();
    for (const t of trips) {
      [t.sourceFactoryId, t.destinationFactoryId].filter(Boolean).forEach((id) => factoryIds.add(String(id)));
      for (const h of t.tripHistory || []) {
        [h.factoryId, h.segment?.sourceFactoryId, h.segment?.destinationFactoryId]
          .filter(Boolean)
          .forEach((id) => factoryIds.add(String(id)));
      }
    }
    const factoryNameById = new Map();
    if (factoryIds.size) {
      const docs = await Factory.find({ _id: { $in: [...factoryIds] } }).select("name").lean();
      docs.forEach((f) => factoryNameById.set(String(f._id), f.name));
    }
    const fName = (id) => (id ? factoryNameById.get(String(id)) || "" : "");

    /* ════════════════════════════════════════════════════════════
       BUILD WORKBOOK
    ════════════════════════════════════════════════════════════ */
    const wb = new ExcelJS.Workbook();
    wb.creator = "Fleet Management System";
    wb.created = new Date();

    /* ── Sheet 1: Trip Details — one row per segment (per material) ── */
    const wsDetail = wb.addWorksheet("Trip Details", {
      views:     [{ state: "frozen", xSplit: 3, ySplit: 2 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    wsDetail.columns = [
      // PINNED (1-3)
      { key: "tripId",         width: 28 },
      { key: "vehicleNo",      width: 16 },
      { key: "purpose",        width: 16 },
      // TRIP INFO (4-7)
      { key: "segNo",          width: 8  },
      { key: "tripType",       width: 14 },
      { key: "status",         width: 12 },
      { key: "cancelReason",   width: 24 },
      // VEHICLE (8-11)
      { key: "vehicleCat",     width: 16 },
      { key: "vehicleType",    width: 18 },
      { key: "pucExpiry",      width: 14 },
      { key: "transporterName",width: 18 },
      // DRIVER (12-16)
      { key: "driverName",     width: 18 },
      { key: "driverContact",  width: 14 },
      { key: "driverIdType",   width: 14 },
      { key: "driverIdNo",     width: 16 },
      { key: "licenseNo",      width: 16 },
      // ROUTE (17-20)
      { key: "srcFactory",     width: 22 },
      { key: "srcLocation",    width: 18 },
      { key: "dstFactory",     width: 22 },
      { key: "dstLocation",    width: 18 },
      // MATERIAL (21-29)
      { key: "matName",        width: 18 },
      { key: "matType",        width: 16 },
      { key: "qty",            width: 10 },
      { key: "unit",           width: 8  },
      { key: "invoiceNo",      width: 16 },
      { key: "invoiceAmt",     width: 16 },
      { key: "seal",           width: 12 },
      { key: "supplier",       width: 18 },
      { key: "customer",       width: 18 },
    ];

    const labelRow1 = wsDetail.addRow([]);
    const sectionDefs = [
      { col: 1,  span: 3, label: "PINNED"           },
      { col: 4,  span: 4, label: "TRIP INFO"        },
      { col: 8,  span: 4, label: "VEHICLE"          },
      { col: 12, span: 5, label: "DRIVER"           },
      { col: 17, span: 4, label: "ROUTE"            },
      { col: 21, span: 9, label: "MATERIAL / CARGO" },
    ];
    sectionDefs.forEach(({ col, span, label }) => {
      labelRow1.getCell(col).value = label;
      if (span > 1) wsDetail.mergeCells(1, col, 1, col + span - 1);
    });
    styleHeader(labelRow1, COLORS.headerBg, COLORS.headerFg);
    labelRow1.height = 22;

    const headerRow1 = wsDetail.addRow([
      "Trip ID", "Vehicle No.", "Purpose",
      "Seg #", "Trip Type", "Status", "Cancellation Reason",
      "Category", "Vehicle Type", "PUC Expiry", "Transporter",
      "Driver Name", "Contact", "ID Type", "ID Number", "License No.",
      "Source Factory", "Source Location", "Dest. Factory", "Dest. Location",
      "Material", "Mat. Type", "Qty", "Unit", "Invoice No.", "Invoice Amt (₹)", "Seal", "Supplier", "Customer",
    ]);
    styleHeader(headerRow1, COLORS.colHeaderBg, COLORS.colHeaderFg);
    headerRow1.height = 32;

    /* ── Sheet 2: Event Log — every history event with its real timestamp ── */
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
      { key: "routeFrom",  width: 22 },
      { key: "routeTo",    width: 22 },
      { key: "timestamp",  width: 22 },
    ];

    const logHeaderRow = wsLog.addRow([
      "Trip ID", "Seg #", "Vehicle No.", "Driver", "Event #",
      "Status", "Action", "Location", "Phase",
      "Action By", "Action Location", "Factory",
      "Route Changed From", "Route Changed To", "Timestamp",
    ]);
    styleHeader(logHeaderRow, COLORS.headerBg, COLORS.headerFg);
    logHeaderRow.height = 24;

    /* ── Sheet 3: Summary ── */
    const wsSummary = wb.addWorksheet("Summary");
    wsSummary.columns = [{ width: 30 }, { width: 22 }, { width: 16 }];

    let totalSegments = 0;
    const vehicleMap = {};
    const driverMap  = {};

    /* ════════════════════════════════════════════════════════════
       MAIN LOOP — trips → segments → materials / events
    ════════════════════════════════════════════════════════════ */
    for (const trip of trips) {
      const tripIdStr = trip._id.toString();
      const segments  = segmentsByTrip.get(tripIdStr) || [];

      // stable sort: timestamp, then original order (same-millisecond events keep their order)
      const sortedHistory = (trip.tripHistory || [])
        .map((ev, i) => ({ ev, i }))
        .sort((a, b) => new Date(a.ev.timestamp) - new Date(b.ev.timestamp) || a.i - b.i)
        .map(({ ev }) => ev);

      const effectiveSegments = segments.length > 0 ? segments : [
        {
          _id:                 trip._id, // fake id
          tripId:              trip._id,
          segmentNumber:       1,
          triptype:            trip.type === "internal_transfer" ? "INTERNAL" : "EXTERNAL",
          purpose:             trip.purpose || "",
          vehicle:             trip.vehicle,
          driver:              trip.driver,
          // trips without TripSegment docs: build the factory objects from the trip's own ids
          sourceFactory:       trip.sourceFactory      || (trip.sourceFactoryId      ? { name: fName(trip.sourceFactoryId) }      : null),
          destinationFactory:  trip.destinationFactory || (trip.destinationFactoryId ? { name: fName(trip.destinationFactoryId) } : null),
          externalSource:      trip.externalSource      || "",
          externalDestination: trip.externalDestination || "",
          materials:           trip.materials?.[0] || null,
          status:              trip.tripState,
          _synthetic:          true,
        },
      ];

      totalSegments += effectiveSegments.length;

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

      const isCancelled  = trip.tripState === "CANCELLED";
      const statusLabel  = isCancelled ? "Cancelled" : "Closed";
      const cancelReason = isCancelled ? (trip.reason || "") : "";

      const segEventGroups = assignEventsToSegments(sortedHistory, effectiveSegments);

      effectiveSegments.forEach((seg, segIdx) => {
        const segEvents = segEventGroups[segIdx];

        const vehicle = seg.vehicle || trip.vehicle || {};
        const driver  = seg.driver  || trip.driver  || {};

        const srcFactory = seg.sourceFactory      || {};
        const dstFactory = seg.destinationFactory || {};

        // internal factory first, external name only if there is no internal factory.
        // Only the segment's own fields are used: falling back to trip-level
        // externalSource/externalDestination is what printed the same external
        // name on both sides.
        const srcFactoryLabel = placeLabel(srcFactory, seg.externalSource);
        const dstFactoryLabel = placeLabel(dstFactory, seg.externalDestination);

        let materials;
        if (seg._synthetic) {
          materials = trip.materials?.length ? trip.materials : [null];
        } else if (seg.materials && Object.keys(seg.materials).length > 0) {
          materials = [seg.materials];
        } else {
          materials = trip.materials?.length ? trip.materials : [null];
        }

        /* ── Trip Details: one row per material ── */
        materials.forEach((mat, mIdx) => {
          const bgHex = isCancelled
            ? COLORS.cancelBg
            : mIdx === 0
              ? (segIdx % 2 === 0 ? COLORS.seg1Bg : COLORS.seg2Bg)
              : COLORS.multiMatBg;

          const dataRow = wsDetail.addRow([
            tripIdStr,
            vehicle.vehicleNumber || "",
            seg.purpose || trip.purpose || "",
            `Seg ${seg.segmentNumber}`,
            seg.triptype === "INTERNAL" ? "Internal" : "External",
            statusLabel,
            cancelReason,
            vehicle.typeOfVehicle || "",
            vehicle.type === "internal" ? "Internal" : "External",
            fmtDate(vehicle.PUCExpiry),
            vehicle.transporterName || "",
            driver.driverName    || "",
            driver.driverContact || "",
            driver.driverIdType  || "",
            driver.driverIdNumber|| "",
            driver.licenseNumber || "",
            srcFactoryLabel,
            srcFactory.location || "",
            dstFactoryLabel,
            dstFactory.location || "",
            mat?.name          || "",
            mat?.material      || "",
            mat?.quantity      ?? "",
            mat?.unit          || "",
            mat?.invoiceNo     || "",
            mat?.invoiceAmount ?? "",
            mat?.seal          || "",
            mat?.supplier      || "",
            mat?.customer      || "",
          ]);
          dataRow.height = 18;
          styleRow(dataRow, bgHex);
          if (mIdx === 0) dataRow.getCell(1).font = { bold: true, name: "Arial", size: 9 };
        });

        /* ── Event Log: one row per event of this segment ── */
        segEvents.forEach((ev, evIdx) => {
          const rc = isRouteChange(ev) || ev.status?.toUpperCase() === "ROUTE_CHANGED";

          // route change: OLD destination → NEW destination.
          // Primary source = the segment that was closed → the segment that was opened.
          // Fallback (no follow-on segment, e.g. old data) = the segment snapshot on the event.
          let routeFrom = "";
          let routeTo   = "";
          if (isRouteChange(ev)) {
            const next = effectiveSegments[segIdx + 1];
            routeFrom = destLabel(seg);
            routeTo   = next
              ? destLabel(next)
              : (fName(ev.segment?.destinationFactoryId) || ev.segment?.externalDestination || "");
          }

          const logRow = wsLog.addRow([
            tripIdStr,
            `Seg ${seg.segmentNumber}`,
            vehicle.vehicleNumber || "",
            driver.driverName     || "",
            evIdx + 1,
            ev.status         || "",
            ev.action         || "",
            ev.location       || "",
            ev.phase          || "",
            ev.actionBy       || "",
            ev.actionLocation || "",
            fName(ev.factoryId),
            routeFrom,
            routeTo,
            fmtDT(ev.timestamp),
          ]);
          logRow.height = 16;
          styleRow(logRow, rc ? COLORS.routeChangeBg : evIdx % 2 === 0 ? COLORS.white : COLORS.evenRowBg);
          if (isRouteChange(ev)) {
            logRow.getCell(13).font = { bold: true, name: "Arial", size: 9 };
            logRow.getCell(14).font = { bold: true, name: "Arial", size: 9 };
          }
        });
      });
    } // end trips loop

    wsDetail.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: wsDetail.columns.length } };
    wsLog.autoFilter    = { from: { row: 1, column: 1 }, to: { row: 1, column: wsLog.columns.length } };

    /* ── Summary ── */
    const addSummaryKV = (label, value, bold = false) => {
      const r = wsSummary.addRow([label, value]);
      if (bold) {
        r.getCell(1).font = { bold: true, name: "Arial", size: 10 };
        r.getCell(2).font = { bold: true, name: "Arial", size: 10 };
      }
    };

    const scopeLabel = factoryDoc?.name
      ? `${factoryDoc.name}${factoryDoc.location ? ` (${factoryDoc.location})` : ""}`
      : "All Locations";

    addSummaryKV("Fleet Trip Download Report", "", true);
    addSummaryKV("Factory / Location", scopeLabel);
    addSummaryKV("Generated At",  `${fmtDT(new Date())} IST`);
    addSummaryKV("Date Range",    `${fmtDate(fromDate)} → ${fmtDate(toDate)}`);
    wsSummary.addRow([]);
    addSummaryKV("Total Trip Documents", trips.length,  true);
    addSummaryKV("Total Segments",       totalSegments, true);
    wsSummary.addRow([]);

    const vHeader = wsSummary.addRow(["Vehicle No.", "Trip Documents", "Segments"]);
    styleHeader(vHeader, COLORS.colHeaderBg, COLORS.colHeaderFg);
    Object.entries(vehicleMap)
      .sort((a, b) => b[1].segments - a[1].segments)
      .forEach(([vn, d]) => {
        const r = wsSummary.addRow([vn, d.docs.size, d.segments]);
        r.eachCell((c) => styleData(c, COLORS.white));
      });

    wsSummary.addRow([]);

    const dHeader = wsSummary.addRow(["Driver", "Contact", "Trip Documents"]);
    styleHeader(dHeader, COLORS.colHeaderBg, COLORS.colHeaderFg);
    Object.entries(driverMap)
      .sort((a, b) => b[1].docs.size - a[1].docs.size)
      .forEach(([dn, d]) => {
        const r = wsSummary.addRow([dn, d.contact, d.docs.size]);
        r.eachCell((c) => styleData(c, COLORS.white));
      });

    /* ════════════════════════════════════════════════════════════
       STREAM RESPONSE — file name carries the factory (or "All-Locations")
    ════════════════════════════════════════════════════════════ */
    const scope = factoryDoc?.name ? slug(factoryDoc.name) : "All-Locations";
    const dayFrom = ymdIST(fromDate || new Date());
    const dayTo   = ymdIST(toDate   || new Date());
    const range   = dayFrom === dayTo ? dayTo : `${dayFrom}_to_${dayTo}`;
    const filename = `closed-trips-${scope}-${range}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    return res.end();

  } catch (error) {
    console.error("Error generating trip download:", error);
    if (res.headersSent) return res.end();

    return res.status(500).json({
      success: false,
      message: "Failed to generate trip report",
      error: error.message,
    });
  }
};