import mongoose from "mongoose";

const factorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
    },
    email: {
        type: String,
    },
     // Factory only decides which sites it supports
    allowedSites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site"
    }],
    
    isIntraMovementAllowed: {
        type: Boolean,
        default: false,
    },

    vehicles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle", 
    }],
    factoryGioLocation: {
        type: String,
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

export default mongoose.model("Factory", factorySchema);