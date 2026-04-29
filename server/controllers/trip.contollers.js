import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
import VehicleState from "../db/models/Vehicle-Model/vehicleState.model.js";
import Trip from "../db/models/Vehicle-Model/trip.model.js";
import GateLog from "../db/models/Vehicle-Model/gate.model.js";
import User from "../db/models/User-Model/user.model.js";
import Driver from "../db/models/Driver-model/driver.model.js";



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
    console.log(req.body);

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

const assignDriverToTrip = async ({ driverId, tripId, vehicleId }) => {
  await Driver.findByIdAndUpdate(driverId, {
    $inc: {
      "stats.totalTrips": 1
    },
    $push: {
      "stats.routeHistory": {
        tripId,
        tripDate: new Date()
      }
    },
    $set: {
      activeTripId: tripId,
      assignedVehicle: vehicleId
    }
  });

  await Vehicle.findByIdAndUpdate(vehicleId, {
    driverId
  });
};

export const externalVehicleRegister = async (req, res) => {
  try {
    console.log("HIT: externalVehicleRegister");
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

    // console.log("External Vehicle Register Payload:", req.body);

    if (!vehicleNumber || !driverIdNumber) {
      return res.status(400).json({
        message: "vehicleNumber and driverIdNumber are required"
      });
    }

    // ========================
    // 1. USER
    // ========================
    const user = await User.findById(req.userId).populate("factory");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ========================
    // 2. VEHICLE (GET OR CREATE)
    // ========================
    let vehicle = await Vehicle.findOne({ vehicleNumber });

    if (!vehicle) {
      vehicle = await Vehicle.create({
        vehicleNumber,
        type: "external",
        ...req.body
      });
    }

    // ========================
    // 3. DRIVER (GET OR CREATE)
    // ========================
    let driver = await Driver.findOne({$or: [{ driverIdNumber },{ licenseNumber }] });

    if (!driver) {
      driver = await Driver.create({
        driverName,
        driverContact,
        driverIdType,
        driverIdNumber,
        licenseNumber,
        typeOfVehicle
      });
    }

    // ========================
    // 4. VEHICLE CHECK
    // ========================
    const existingTrip = await Trip.findOne({
      vehicleId: vehicle._id,
      tripState: { $in: ["ACTIVE", "COMPLETED", "PENDING"] }
    });

    if (existingTrip) {
      return res.status(400).json({
        message: "Vehicle already on a trip"
      });
    }

    // ========================
    // 5. CREATE TRIP
    // ========================
    let newTrip = null;

    if(vehicle && driver){
      newTrip = await Trip.create({
        vehicleId: vehicle._id,
        driverId: driver._id,
        type: isInternalShifting? "internal_transfer": "external_delivery",
        phase: isInternalShifting ? "ORIGIN" : "DESTINATION",
        location: isInternalShifting? "inside_factory": "outside_factory",
        externalSource: isInternalShifting? null : req.body.source, // for external source customer name will be in source, for internal shifting it will be null
        sourceFactoryId: isInternalShifting? user.factory._id: null,
        destinationFactoryId: isInternalShifting? req.body.destinationFactoryId: req.body.sourceFactoryId,
        purpose: req.body.purpose || "Delivery",
        status: isInternalShifting ? "ORIGIN" : "ARRIVED",
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
            status: isInternalShifting ? "ORIGIN" : "ARRIVED",
            location: isInternalShifting? "inside_factory" : "outside_factory",
            phase: isInternalShifting ? "ORIGIN" : "DESTINATION",
            factoryId: isInternalShifting ? req.body.sourceFactoryId: user.factory._id || null,
            action: "begin",
            timestamp: new Date(),
            segment: {
              movementType: isInternalShifting? "internal" : "external",
              externalSource: isInternalShifting? null : req.body.source?? null,
              sourceFactoryId: isInternalShifting? req.body.sourceFactoryId: null,
              destinationFactoryId: user.factory._id?? null,
              startedAt: new Date(),
              completedAt: null,
            }
          }
        ]
      });
    
    }

    // ========================
    // 6. ASSIGN RELATIONS
    // ========================
    await assignDriverToTrip({
      driverId: driver._id,
      tripId: newTrip._id,
      vehicleId: vehicle._id
    });

    vehicle.currentTrip = newTrip._id;
    vehicle.currentFactoryId = isInternalShifting ? req.body.sourceFactoryId : null;
    await vehicle.save();

    // ========================
    // 7. RESPONSE
    // ========================
    return res.status(201).json({
      success: true,
      trip: newTrip
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message
    });
  }
};

export const internalVehicleRegister = async (req, res) => {
  try {
    console.log("HIT: internalVehicleRegister");
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

    // ========================
    // 1. VALIDATION
    // ========================
    if (!vehicleNumber || !driverIdNumber) {
      return res.status(400).json({
        message: "vehicleNumber and driverIdNumber are required"
      });
    }

    // ========================
    // 2. USER
    // ========================
    const user = await User.findById(req.userId).populate("factory");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // ========================
    // 3. VEHICLE (GET OR CREATE)
    // ========================
    let vehicle = await Vehicle.findOne({ vehicleNumber });

    if (!vehicle) {
      vehicle = await Vehicle.create({
        ...req.body,
        vehicleNumber,
        type: "internal"
      });
    }

    // ========================
    // 4. DRIVER (GET OR CREATE)
    // ========================
    let driver = await Driver.findOne({$or: [{ driverIdNumber },{ licenseNumber }] });

    if (!driver ) {
      driver = await Driver.create({
        driverName,
        driverContact,
        driverIdType,
        driverIdNumber,
        licenseNumber
      });
    }

    // ========================
    // 5. VEHICLE CHECK
    // ========================
    const existingTrip = await Trip.findOne({
      vehicleId: vehicle._id,
      tripState: { $in: ["ACTIVE", "COMPLETED", "PENDING"] }
    });

    if (existingTrip) {
      return res.status(400).json({
        message: "Vehicle already on a trip"
      });
    }

    // ========================
    // 6. CREATE TRIP
    // ========================
    let newTrip = null;

    if(vehicle && driver){
      newTrip = await Trip.create({
        vehicleId: vehicle._id,
        driverId: driver._id,
        type: "internal_transfer",
        phase: "ORIGIN",
        location: "inside_factory",
        sourceFactoryId: user.factory?._id || null,
        destinationFactoryId: destinationFactoryId || null,
        purpose: purpose || "Delivery",
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
      });
  }
    // ========================
    // 7. ASSIGN RELATIONS
    // ========================
    await assignDriverToTrip({
      driverId: driver._id,
      tripId: newTrip._id,
      vehicleId: vehicle._id
    });
    
    if(newTrip){
      vehicle.currentTrip = newTrip._id;
      vehicle.currentFactoryId = newTrip.sourceFactoryId || null;
      await vehicle.save();
    }

    // ========================
    // 8. RESPONSE
    // ========================
    return res.status(201).json({
      success: true,
      trip: newTrip
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message
    });
  }
};

export const checkinVehicle = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(400).json({message: "Trip not found"});

    if (trip.status !== "ARRIVED") {
      return res.status(400).json({message: "Vehicle must arrived before check-in"});
    }

    if (trip.location === "inside_factory") {
      return res.status(400).json({message: "Vehicle already checked in"});

    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        location: "inside_factory",
        completedAt: new Date(),
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
              completedAt: new Date()
             }
          }
        }
      },
      { new: true }
    );

    const vehicle = await Vehicle.findById(trip.vehicleId);
    if (vehicle) {
      vehicle.currentFactoryId = trip.destinationFactoryId || null;
      await vehicle.save();
    }

   return res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle checked in successfully"
    });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const unloadTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const user = await User.findById(req.userId).populate("factory");

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(400).json({message: "Trip not found."});


    //  Guard conditions (this is where most devs are sloppy)
    if (trip.status !== "ARRIVED") {
      return res.status(400).json({message: "Trip must be ARRIVED before unloading"});
    }

    if (trip.location !== "inside_factory") {
      return res.status(400).json({message: "Vehicle must be inside factory before unloading"});
    }

    if (trip.loadStatus === "unloaded") {
      return res.status(400).json({message: "Trip already unloaded"});
    }

    //  Update trip
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        loadStatus: "unloaded",
        completedAt: new Date(),

        $push: {
          tripHistory: {
            status: trip.status,
            location: trip.location,
            phase:"DESTINATION",
            factoryId: trip.destinationFactoryId || user.factory._id || null,
            action: "unload",
            timestamp: new Date(),
            segment: {
              type: trip.type === "internal_transfer" ? "internal" : "external",
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
      { new: true }
    );

    return res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle unloaded successfully"
    });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const completeTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(400).json({message: "Trip not found."});

    //  Proper guard conditions
    if ( trip.loadStatus === "pending") {
      return res.status(400).json({message: `Trip cannot be ready to check-out before "${trip.purpose === "Pickup"? "Load" : "Unload"}". Current load status: ${trip.loadStatus}`});
    }

    if (trip.location !== "inside_factory") {
     return res.status(400).json({message: "Vehicle must be inside factory to close trip"});
    }

    if (trip.tripState === "CLOSED") {
      return res.status(400).json({message: "Trip already closed"});
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        tripState: "COMPLETE",
        completedAt: new Date(),
        $push: {
          tripHistory: {
            status: trip.status,
            location: trip.location,
            phase:"DESTINATION",
            factoryId: trip.destinationFactoryId || null,
            action: "complete",
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
      { new: true }
    );

    return res.json({
      success: true,
      trip: updatedTrip,
      message: "Trip closed successfully"
    });

  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};

export const checkoutVehicle = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);

    if (!trip) return res.status(400).json({message: "Trip not found."});

    if (trip.location !== "inside_factory") {
      return res.status(400).json({message: "Vehicle must be in transit to checkout"});
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        location: "enroute",
        status: "IN_TRANSIT",
        completedAt: new Date(),
        $push: {
          tripHistory: {
            status: trip.status,
            location: "enroute",
            factoryId: trip.sourceFactoryId || null,
            phase: "DESTINATION",
            action: "checkout",
            timestamp: new Date(),
            segment: {
              type: trip.type === "internal_transfer" ? "internal" : "external",
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
      { new: true }
    );
    return res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle checked out successfully"
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};

export const checkoutAndExitVehicle = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // ========================
    // 1. VALIDATION
    // ========================
    if (trip.tripState === "CLOSED") {
      return res.status(400).json({
        message: "Trip already closed"
      });
    }

    if (trip.location !== "inside_factory") {
      return res.status(400).json({
        message: "Vehicle must be inside factory to checkout"
      });
    }

    // ========================
    // 2. CLOSE TRIP
    // ========================
    const now = new Date();

    const updatedTrip = await Trip.findByIdAndUpdate(
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
            factoryId: trip.destinationFactoryId || null,
            phase: "DESTINATION",
            action: "closed",
            timestamp: now,
            segment: {
              type: trip.type === "internal_transfer" ? "internal" : "external",
              externalSource: null,
              externalDestination: trip.externalDestination?? null,
              sourceFactoryId: trip.sourceFactoryId?? null,
              destinationFactoryId: trip.type === "internal_transfer"? trip.destinationFactoryId: null,
              startedAt: trip.startedAt,
              completedAt: now,
            }
          }
        }
      },
      { new: true }
    );

    // ========================
    // 3. RELEASE DRIVER + UPDATE STATS
    // ========================
    if (trip.driverId) {
      const duration =
        updatedTrip.completedAt && updatedTrip.startedAt
          ? Math.floor(
              (updatedTrip.completedAt - updatedTrip.startedAt) / 1000
            )
          : 0;

      await Driver.findByIdAndUpdate(trip.driverId, {
        $inc: {
          "stats.totalTime": duration
          // distance → only if you track it
        },
        $set: {
          activeTripId: null,
          assignedVehicle: null
        }
      });
    }

    // ========================
    // 4. RELEASE VEHICLE
    // ========================
    if (trip.vehicleId) {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        driverId: null,
        currentTrip: null
      });
    }

    // ========================
    // 5. RESPONSE
    // ========================
    return res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle checked out and trip closed successfully"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

export const markArrived = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);

    if (!trip) return res.status(404).json({message: "Trip not found."});;

    if (trip.location !== "enroute") {
     return res.status(400).json({message: "Vehicle must be enroute to mark arrived"}); 
    }
    
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        location: "outside_factory",
        status: "ARRIVED",
        phase: "DESTINATION",
        completedAt: new Date(),
        $push: {
          tripHistory: {
            status: trip.status,
            location: "outside_factory",
            factoryId: trip.destinationFactoryId || null,
            phase: "DESTINATION",
            action: "arrive",
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
      { new: true }
    );
   return res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle marked as arrived successfully"
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};

export const markInternalTransferComplete = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // ========================
    // 1. VALIDATION
    // ========================
    if (trip.tripState === "CLOSED") {
      return res.status(400).json({
        message: "Trip already completed"
      });
    }

    if (trip.tripState === "CANCELLED") {
      return res.status(400).json({
        message: "Cancelled trip cannot be completed"
      });
    }

    if (trip.location !== "inside_factory") {
      return res.status(400).json({
        message: "Vehicle must be inside factory to complete trip"
      });
    }

    const now = new Date();

    // ========================
    // 2. CLOSE TRIP
    // ========================
    const updatedTrip = await Trip.findByIdAndUpdate(
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
              completedAt: now,
            }
          }
        }
      },
      { new: true }
    );

    // ========================
    // 3. UPDATE DRIVER STATS + RELEASE
    // ========================
    if (trip.driverId) {
      const duration =
        updatedTrip.completedAt && updatedTrip.startedAt
          ? Math.floor(
              (updatedTrip.completedAt - updatedTrip.startedAt) / 1000
            )
          : 0;

      await Driver.findByIdAndUpdate(trip.driverId, {
        $inc: {
          "stats.totalTime": duration
          // add distance if available
        },
        $set: {
          activeTripId: null,
          assignedVehicle: null,
          
        }
      });
    }

    // ========================
    // 4. RELEASE VEHICLE
    // ========================
    if (trip.vehicleId) {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        driverId: null,
        currentTrip: null
      });
    }

    // ========================
    // 5. RESPONSE
    // ========================
    return res.json({
      success: true,
      trip: updatedTrip,
      message: "Trip marked as closed successfully"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

export const markLoadCompleteAtDestination = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({message: "Trip not found."});

    if (trip.location !== "inside_factory") {
      return res.status(400).json({message: "Vehicle must be inside factory to mark load complete"});
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        loadStatus: "loaded",
        completedAt: new Date(),
        $push: {
          tripHistory: {
            status: trip.status,
            location: trip.location,
            phase: "DESTINATION",
            factoryId: trip.destinationFactoryId || null,
            action: "load",
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
      { new: true }
    );
    return res.json({
      success: true,
      trip: updatedTrip,
      message: "Trip load marked as complete successfully"
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
};

export const cancelTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const user = await User.findById(req.userId);

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // ========================
    // 1. VALIDATION
    // ========================
    if (trip.tripState === "CANCELLED") {
      return res.status(400).json({
        message: "Trip already cancelled"
      });
    }

    if (trip.tripState === "CLOSED") {
      return res.status(400).json({
        message: "Cannot cancel a completed trip"
      });
    }

    const now = new Date();

    // ========================
    // 2. CANCEL TRIP
    // ========================
    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        tripState: "CANCELLED",
        completedAt: now,
        $push: {
          tripHistory: {
            status: "CANCELLED",
            location: trip.location,
            phase: trip.phase, 
            factoryId: user.factory || null,
            action: "cancelled",
            timestamp: now,
            segment: {
              movementType: trip.type === "internal_transfer" ? "internal" : "external",
              externalSource: trip.externalSource,
              externalDestination: trip.externalDestination,
              sourceFactoryId: trip.sourceFactoryId,
              destinationFactoryId: trip.destinationFactoryId,
              startedAt: trip.startedAt,
              completedAt: now,
            }
          }
        }
      },
      { new: true }
    );

    // ========================
    // 3. RELEASE DRIVER
    // ========================
    if (trip.driverId) {
      await Driver.findByIdAndUpdate(trip.driverId, {
        $set: {
          activeTripId: null,
          assignedVehicle: null
        }
      });
    }

    // ========================
    // 4. RELEASE VEHICLE
    // ========================
    if (trip.vehicleId) {
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        driverId: null,
        currentTrip: null
      });
    }

    // ========================
    // 5. RESPONSE
    // ========================
    return res.json({
      success: true,
      trip: updatedTrip,
      message: "Trip cancelled successfully"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

export const changeRoute = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { newDestinationFactoryId, customer, type } = req.body;

    const user = await User.findById(req.userId).populate("factory");
    if (!user?.factory) {
      return res.status(404).json({ message: "User or factory not found" });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({message: "Trip not found."});

    if (["CLOSED", "CANCELLED"].includes(trip.tripState)) {
      return res.status(400).json({message: "Cannot change route of a closed or cancelled trip"});
    }

    //  Validation
    if (type === "internal" && !newDestinationFactoryId) {
      return res.status(400).json({message: "New destination factory is required for internal transfer"});
    }

    if (type === "external" && !customer) {
      return res.status(400).json({message: "Customer is required for external movement"});
    }

    //  Prevent same destination
    if (
      type === "internal" &&
      String(trip.destinationFactoryId) === String(newDestinationFactoryId)
    ) {
      return res.status(400).json({message: "Trip is already assigned to this factory"});
    }

    const updatePayload = {
      type: type === "external" ? "external_delivery" : "internal_transfer",
      externalDestination: type === "external" ? customer : null,
      sourceFactoryId:  user.factory._id,
      destinationFactoryId: type === "internal" ? newDestinationFactoryId : null,
    };

    const now = new Date();
    const segmentData = {
      movementType: type,
      externalDestination: type === "internal"? null : customer,
      sourceFactoryId: trip.destinationFactoryId,
      destinationFactoryId: type === "internal"? newDestinationFactoryId : null,  
      startedAt: trip.startedAt,
      completedAt: now,
    };


    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        phase: "ORIGIN",
        status:"ORIGIN",
        startedAt: now,
        ...updatePayload,
        $push: {
          tripHistory: {
            status: "ROUTE_CHANGED",
            phase: "ROUTE_UPDATE",
            location: trip.location || null,
            factoryId: user.factory._id,
            action: "route_change",
            timestamp: new Date(),
            segment: segmentData
          },
        },
      },
      { new: true }
    );

    return res.json({
      success: true,
      trip: updatedTrip,
      message: "Trip route updated successfully",
    });

  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: err.message });
  }
};



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