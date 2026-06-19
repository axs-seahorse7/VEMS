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
    alertInterval: {
        type: Number,
        default: 15, // in minutes
    }
}, { timestamps: true });

export const AlertEmailUsers = mongoose.model("AlertEmailUsers", alertEmailUsersSchema);