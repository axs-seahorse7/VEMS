import Vehicle from "../db/models/Vehicle-Model/vehicle.model.js";

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

    res.status(200).json(vehicles);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch vehicles", error: err.message });
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
    res.status(200).json(vehicle);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to fetch vehicle", error: err.message });
  }
};

export const getVehicleByNumber = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ vehicleNumber: req.params.vehicleNumber.toUpperCase() }).populate(
      "ownerFactoryId",
      "name location contactNumber"
    );
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.status(200).json(vehicle);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to fetch vehicle", error: err.message });
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
    res.status(201).json({ message: "Vehicle registered successfully.", vehicle: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Vehicle number already exists." });
    }
    res.status(500).json({ message: "Failed to create vehicle", error: err.message });
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

    res.status(200).json({ message: "Vehicle updated successfully.", vehicle: populated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update vehicle", error: err.message });
  }
};

// DELETE /vehicles/:id
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.status(200).json({ message: "Vehicle deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete vehicle", error: err.message });
  }
};

// PATCH /vehicles/:id/toggle-status
export const toggleVehicleStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    vehicle.isActive = !vehicle.isActive;
    await vehicle.save();

    res.status(200).json({
      message: `Vehicle marked as ${vehicle.isActive ? "active" : "inactive"}.`,
      isActive: vehicle.isActive,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle status", error: err.message });
  }
};