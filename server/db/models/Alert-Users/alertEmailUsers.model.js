import mongoose from 'mongoose';

const alertEmailUsersSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
         required: true
    },
    designation: {
        type: String,
        enum: ["Department", "HOD", "PlantHead"]
    },
    factoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Factory",
        required: true,
        index: true
    },
    isPaused: {
        type: Boolean,
        default: false
    },
    alertTypes: {
        type: [String],
        enum: ["tripCancelled", "delayTrips", "vehicleEntry", "vehicleExit"],
        default: ["tripCancelled",]
    },
    alertSubscriptions: [{
        type: String,
        enum: [
            "tripCancelled",
            "delay4h",
            "delay12h",
            "delay24h",
            "vehicleEntry",
            "vehicleExit"
        ]
    }]


}, { timestamps: true });

export const AlertEmailUsers = mongoose.model("AlertEmailUsers", alertEmailUsersSchema);