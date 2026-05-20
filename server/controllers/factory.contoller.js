import factoryModel from "../db/models/factory-model/factory.model.js";

export const createFactory = async (req, res) => {
    try {
        const { name, location, contactNumber, email, factoryGioLocation, status } = req.body;
        if (!name || !location) {
            return res.status(400).json({ message: "Name and location are required" });
        }
        const newFactory = new factoryModel({
            name,
            location,
            contactNumber,
            email,
            factoryGioLocation,
            status: status || "active",
        });
        await newFactory.save();
        return res.status(201).json({ message: "Factory created successfully", success: true, factory: newFactory });
    } catch (error) {
        console.error("Error creating factory:", error);
        return res.status(400).json({ message: error.message });
    }
};

export const getFactories = async (req, res) => {
    try {
        // Never return soft-deleted factories
        const factories = await factoryModel.find({ isDeleted: false, status: "active" }).populate("vans");
        return res.status(200).json({ factories });
    } catch (error) {
        console.error("Error getting factories:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getFactoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const factory = await factoryModel.findOne({ _id: id, isDeleted: false }).populate("vans");
        if (!factory) {
            return res.status(404).json({ message: "Factory not found" });
        }
        return res.status(200).json({ factory });
    } catch (error) {
        console.error("Error getting factory by ID:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── Fixed: now updates all fields including status and factoryGioLocation ──
export const updateFactory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, contactNumber, email, factoryGioLocation, status } = req.body;

        const updatedFactory = await factoryModel.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { name, location, contactNumber, email, factoryGioLocation, status },
            { new: true, runValidators: true }
        );

        if (!updatedFactory) {
            return res.status(404).json({ message: "Factory not found" });
        }
        return res.status(200).json({ message: "Factory updated successfully", success: true, factory: updatedFactory });
    } catch (error) {
        console.error("Error updating factory:", error);
        return res.status(400).json({ message: error.message });
    }
};

// ── Toggle active ↔ inactive ──────────────────────────────────────────────────
export const toggleFactoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const factory = await factoryModel.findOne({ _id: id, isDeleted: false });
        if (!factory) {
            return res.status(404).json({ message: "Factory not found" });
        }
        factory.status = factory.status === "active" ? "inactive" : "active";
        await factory.save();
        return res.status(200).json({ message: `Factory marked as ${factory.status}`, success: true, factory });
    } catch (error) {
        console.error("Error toggling factory status:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── Soft delete ───────────────────────────────────────────────────────────────
export const deleteFactory = async (req, res) => {
    try {
        const { id } = req.params;
        const factory = await factoryModel.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );
        if (!factory) {
            return res.status(404).json({ message: "Factory not found" });
        }
        return res.status(200).json({ message: "Factory deleted successfully", success: true });
    } catch (error) {
        console.error("Error deleting factory:", error);
        return res.status(500).json({ message: "Server error" });
    }
};