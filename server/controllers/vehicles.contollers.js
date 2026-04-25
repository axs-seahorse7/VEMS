import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";
import Driver from "../db/models/Driver-model/driver.model.js";
// GET /vehicles
export const getAllVehicles = async (req, res) => {
  try {
    const { type, typeOfVehicle, isActive, factoryId } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (typeOfVehicle) filter.typeOfVehicle = typeOfVehicle;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (factoryId) filter.ownerFactoryId = factoryId;

    const vehicles = await Vehicle.find(filter)
      .populate("ownerFactoryId", "name location")
      .sort({ createdAt: -1 });

   return res.status(200).json(vehicles);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch vehicles", error: err.message });
  }
};

// GET /vehicles/:id
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate(
      "ownerFactoryId",
      "name location contactNumber"
    );
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    return res.status(200).json(vehicle);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Failed to fetch vehicle", error: err.message });
  }
};

export const getVehicleByNumber = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ vehicleNumber: req.params.vehicleNumber.toUpperCase() }).populate(
      "ownerFactoryId",
      "name location contactNumber"
    );
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    return res.status(200).json(vehicle);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Failed to fetch vehicle", error: err.message });
  }
};

// POST /vehicles
export const createVehicle = async (req, res) => {
  try {
    const { vehicleNumber, type, typeOfVehicle, ownerFactoryId, isActive } = req.body;

    if (!vehicleNumber || !type || !typeOfVehicle) {
      return res.status(400).json({ message: "vehicleNumber, type, and typeOfVehicle are required." });
    }

    const existing = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: `Vehicle with number "${vehicleNumber}" already exists.` });
    }

    const vehicle = await Vehicle.create({
      ...req.body,
      vehicleNumber: vehicleNumber.toUpperCase(),
      isActive: isActive !== undefined ? isActive : true,
    });

    const populated = await vehicle.populate("ownerFactoryId", "name location");
    return res.status(201).json({ message: "Vehicle registered successfully.", vehicle: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Vehicle number already exists." });
    }
    return res.status(500).json({ message: "Failed to create vehicle", error: err.message });
  }
};

// PUT /vehicles/:id
// PUT /vehicles/:id
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const updatableFields = [
      "type",
      "typeOfVehicle",
      "ownerFactoryId",
      "isActive",
      "driverName",
      "driverContact",
      "transporterName",
      "driverIdNumber",
      "PUCExpiry",
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        // Coerce empty strings to null for optional reference/date fields
        if (field === "ownerFactoryId" || field === "PUCExpiry") {
          vehicle[field] = req.body[field] || null;
        } else {
          vehicle[field] = req.body[field];
        }
      }
    }

    await vehicle.save();
    const populated = await vehicle.populate("ownerFactoryId", "name location");

    return res.status(200).json({ message: "Vehicle updated successfully.", vehicle: populated });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update vehicle", error: err.message });
  }
};

// DELETE /vehicles/:id
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    return res.status(200).json({ message: "Vehicle deleted successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete vehicle", error: err.message });
  }
};

// PATCH /vehicles/:id/toggle-status
export const toggleVehicleStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    vehicle.isActive = !vehicle.isActive;
    await vehicle.save();

    return res.status(200).json({
      message: `Vehicle marked as ${vehicle.isActive ? "active" : "inactive"}.`,
      isActive: vehicle.isActive,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to toggle status", error: err.message });
  }
};


export const lookupDriver = async (req, res) => {
  try {
    const { driverContact, driverIdNumber } = req.query;
 
    if (!driverContact && !driverIdNumber) {
      return res.status(400).json({ message: "Provide driverContact or driverIdNumber" });
    }
 
    // Build query: try the supplied field first, OR both if somehow both arrive
    const query = {};
    if (driverContact)  query.driverContact  = driverContact.trim();
    if (driverIdNumber) query.driverIdNumber = driverIdNumber.trim().toUpperCase();
 
    // $or so either field can match
    const driver = await Driver.findOne({ $or: Object.entries(query).map(([k, v]) => ({ [k]: v })) })
      .select("driverName driverContact driverIdType driverIdNumber licenseNumber assignedVehicle activeTripId")
      .lean();
 
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
 
    return res.status(200).json({ driver });
  } catch (err) {
    console.error("Error looking up driver:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


//routes for client side lookup of vehicle by number

export const getAvailableVehicles = async (req, res) => {
  try {
    const { type, typeOfVehicle, page = 1, limit = 50 } = req.query;
    
    const filter = {
      isActive: true,
      type: { $in: ["internal"] },
      $or: [
        
        { currentTrip: null },
        { currentTrip: { $exists: false } }
      ]
    };
 
    if (type) filter.type = type;
    if (typeOfVehicle) filter.typeOfVehicle = typeOfVehicle;
 
    const skip = (Number(page) - 1) * Number(limit);
 
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .populate("driverId", "name contact")          // driver basic info
        .populate("ownerFactoryId", "name location")
        .populate("currentFactoryId", "name location")  // factory basic info
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Vehicle.countDocuments(filter),
    ]);
 
    return res.status(200).json({
      success: true,
      data: vehicles,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching available vehicles:", error);
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available vehicles.",
      error: error.message,
    });
  }
};
 