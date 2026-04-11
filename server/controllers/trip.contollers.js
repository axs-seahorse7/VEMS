import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
import VehicleState from "../db/models/Vehicle-Model/vehicleState.model.js";
import Trip from "../db/models/Vehicle-Model/trip.model.js";
import GateLog from "../db/models/Vehicle-Model/gate.model.js";
import User from "../db/models/User-Model/user.model.js";



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

    res.json(trip || null);

  } catch (err) {
    res.status(400).json({ error: err.message });
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

    res.json(trips);

  } catch (err) {
    res.status(400).json({ error: err.message });
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

    res.json(trips);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const cancelTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error("Trip not found");

    if (trip.status !== "in_transit") {
      throw new Error("Only active trips can be cancelled");
    }

    trip.status = "cancelled";
    await trip.save();

    // Update vehicle state
    await VehicleState.findOneAndUpdate(
      { vehicleId: trip.vehicleId },
      {
        status: "inside_factory",
        currentFactoryId: trip.sourceFactoryId,
        currentTripId: null
      }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getIncomingTrips = async (req, res) => {
  const { factoryId } = req.params;

  const trips = await Trip.find({
    destinationFactoryId: factoryId,
    status: "in_transit"
  }).populate("vehicleId");

  res.json(trips);
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
    res.json({trip, success: true});
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// export const unloadTrip = async (req, res) => {
//   try {
//     const { tripId } = req.params;

//     const trip = await Trip.findById(tripId);
//     if (!trip) throw new Error("Trip not found");

//     if (trip.status !== "arrived") {
//       throw new Error("Only arrived trips can be unloaded");
//     }

//     if (trip.purpose !== "Delivery") {
//       throw new Error("Unload allowed only for delivery trips");
//     }

//     const vehicle = await Vehicle.findById(trip.vehicleId);
//     if (!vehicle) throw new Error("Vehicle not found");

//     const factoryId = trip.destinationFactoryId;

//     // 1. Log operation (NOT checkout)
//     await GateLog.create({
//       vehicleId: vehicle._id,
//       factoryId,
//       tripId: trip._id,
//       action: "unload" //  FIXED
//     });

//     // 2. Update trip
//     trip.loadStatus = "unloaded";
//     trip.status = "completed";
//     trip.completedAt = new Date();
//     await trip.save();

//     // 3. Update state (vehicle STILL inside)
//     await VehicleState.findOneAndUpdate(
//       { vehicleId: vehicle._id },
//       {
//         status: "inside_factory",   //  FIXED
//         currentFactoryId: factoryId,
//         currentTripId: null         // trip finished
//       }
//     );

//     res.json({ success: true });

//   } catch (err) {
//     console.error(err);
//     res.status(400).json({ error: err.message });
//   }
// };





export const externalVehicleRegister = async (req, res) => {
  try {
    const { vehicleNumber } = req.body;
    console.log(req.body);
    if (!vehicleNumber) {
      return res.status(400).json({ message: "vehicleNumber is required." });
    }

    let vehicle = await Vehicle.findOne({ vehicleNumber: vehicleNumber });
    if (!vehicle){
      const newVehicle = await Vehicle.create({ 
        ...req.body,
        vehicleNumber, 
        type: "external",
      });

      vehicle = newVehicle;
      }
    let newTrip = null;

      if(vehicle){
       newTrip = await Trip.create({
        vehicleId: vehicle._id,
        type: "external_delivery",
        phase: "DESTINATION",
        location: "outside_factory",
        sourceFactoryId: null,
        destinationFactoryId: req.body.sourceFactoryId || null,
        purpose: "Delivery",
        status: "ARRIVED",
        loadStatus: "pending",
        startedAt: new Date(),
        completedAt: new Date(),
        materials: [{
          material: req.body.material,
          quantity: req.body.quantity,
          invoiceNo: req.body.invoiceNo,
          unit: req.body.unit,
          invoiceAmmount: req.body.invoiceAmount,
          customer: req.body.customer
        }],
        tripHistory: [{
          status: "ARRIVED",
          location: "outside_factory",
          action: "begin",
          timestamp: new Date()
        }]

      });
    }

    res.status(201).json({ success: true, trip: newTrip });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const internalVehicleRegister = async (req, res) => {
  try {
    const { vehicleNumber } = req.body;
    const user = await User.findById(req.userId);
    console.log(req.body);
    if (!vehicleNumber) {
      return res.status(400).json({ message: "vehicleNumber is required." });
    }

    let vehicle = await Vehicle.findOne({ vehicleNumber: vehicleNumber });
    if (!vehicle){
      const newVehicle = await Vehicle.create({
        ...req.body,
        vehicleNumber, 
        type: "internal",
      });

      vehicle = newVehicle;
      }

      const existingTrip = await Trip.findOne({
        vehicleId: vehicle._id,
        tripState: { $in: ["ACTIVE", "COMPLETED", "PENDING"] }
      });

      if (existingTrip) {
        return res.status(400).json({ message: "Vehicle already on a trip." });
      }

    let newTrip = null;

      if(vehicle){
       newTrip = await Trip.create({
        vehicleId: vehicle._id,
        type: "internal_transfer",
        phase: "ORIGIN",
        location: "inside_factory",
        sourceFactoryId: user.factory || null,
        destinationFactoryId: req.body.destinationFactoryId || null,
        purpose: "Delivery",
        status: "ORIGIN",
        loadStatus: "pending",
        startedAt: new Date(),
        completedAt: new Date(),
        materials: [{
          material: req.body.material,
          quantity: req.body.quantity,
          invoiceNo: req.body.invoiceNo,
          unit: req.body.unit,
          invoiceAmmount: req.body.invoiceAmount,
          customer: req.body.customer
        }],
        tripHistory: [{
          status: "ORIGIN",
          phase: "ORIGIN",
          location: "inside_factory",
          action: "begin",
          timestamp: new Date()
        }]

      });
    }

    res.status(201).json({ success: true, trip: newTrip });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const getVehicleTrips = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("factory");
    if (!user) throw new Error("User not found");

    const factoryId = user.factory._id;

    const matchStage = {
      $or: [
        { destinationFactoryId: factoryId },
        { sourceFactoryId: factoryId }
      ]
    };

    if (["storeSite", "dispatchSite"].includes(user.workLocation)) {
      matchStage.tripState = { $ne: "CLOSED" };
    }

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

      //  Restriction
      {
        $match: {
          $nor: [
            {
              "vehicle.status": "checkout",
              type: "external_delivery"
            }
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

      //  Optional: clean output
      {
        $project: {
          vehicle: 1,
          type: 1,
          phase: 1,
          location: 1,
          status: 1,
          purpose: 1,
          tripState: 1,
          loadStatus: 1,
          sourceFactory: 1,
          tripHistory: 1,
          destinationFactory: 1,
          createdAt: 1
        }
      },

      { $sort: { createdAt: -1 } }
    ]);

    res.json(trips);

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const checkinVehicle = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error("Trip not found");

    if (trip.status !== "ARRIVED") {
      throw new Error("Vehicle must arrive before check-in");
    }

    if (trip.location === "inside_factory") {
      throw new Error("Vehicle already checked in");
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
            action: "checkin",
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle checked in successfully"
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const unloadTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error("Trip not found");

    //  Guard conditions (this is where most devs are sloppy)
    if (trip.status !== "ARRIVED") {
      throw new Error("Trip must be ARRIVED before unloading");
    }

    if (trip.location !== "inside_factory") {
      throw new Error("Vehicle must be inside factory before unloading");
    }

    if (trip.loadStatus === "unloaded") {
      throw new Error("Trip already unloaded");
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
            action: "unload",
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle unloaded successfully"
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const closeTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error("Trip not found");

    //  Proper guard conditions
    if (trip.loadStatus !== "unloaded") {
      throw new Error("Trip must be unloaded before closing");
    }

    if (trip.location !== "inside_factory") {
      throw new Error("Vehicle must be inside factory to close trip");
    }

    if (trip.tripState === "CLOSED") {
      throw new Error("Trip already closed");
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      {
        tripState: "CLOSED",
        completedAt: new Date(),

        $push: {
          tripHistory: {
            status: trip.status,
            location: trip.location,
            action: "complete",
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      trip: updatedTrip,
      message: "Trip closed successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const checkoutVehicle = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);

    if (!trip) throw new Error("Trip not found");

    if (trip.location !== "inside_factory") {
      throw new Error("Vehicle must be in transit to checkout");
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
            action: "checkout",
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );
    res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle checked out successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const markArrived = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);

    if (!trip) throw new Error("Trip not found");

    if (trip.location !== "enroute") {
      throw new Error("Vehicle must be enroute to mark arrived");
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
            action: "arrive",
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );
    res.json({
      success: true,
      trip: updatedTrip,
      message: "Vehicle marked as arrived successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};