import factoryModel from "../db/models/factory-model/factory.model.js";

export const createFactory = async (req, res) => {
    try {
        const { name, location, contactNumber, email } = req.body;
        if(!name || !location ) {
            return res.status(400).json({ message: "Name and location are required" });
        }
        const newFactory = new factoryModel({
            name,
            location,
            contactNumber,
            email
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
        const factories = await factoryModel.find();
        return res.status(200).json({ factories });
    } catch (error) {
        console.error("Error getting factories:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const updateFactory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, contactNumber, email } = req.body;
        const updatedFactory = await factoryModel.findByIdAndUpdate(id, { name, location, contactNumber, email }, { new: true });
        if (!updatedFactory) {
            return res.status(404).json({ message: "Factory not found" });
        }
        return res.status(200).json({ message: "Factory updated successfully", success: true, factory: updatedFactory });
    } catch (error) {
        console.error("Error updating factory:", error);
        return res.status(400).json({ message: error.message });
    }
};

export const getFactoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const factory = await factoryModel.findById(id).populate("vans");   
        if (!factory) {
            return res.status(404).json({ message: "Factory not found" });
        }
        return res.status(200).json({ factory });
    } catch (error) {
        console.error("Error getting factory by ID:", error);
        return res.status(500).json({ message: "Server error" });
    }
};