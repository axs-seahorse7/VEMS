import mongoose from "mongoose";

const intraMovementSchema = new mongoose.Schema(
  {
    status: {
        type: String,   
        enum: ["ACTIVE", "COMPLETED", "CLOSED", "CANCELLED"],
        default: "ACTIVE",
        index: true,
    },

    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip",
        index: true
    },

    siteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site",
        index: true
    },

    blockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Block",
        index: true
    },

    timeLogs:{
        checkIn: {
            type: Date,
            default: null,
        },
        checkOut: {
            type: Date,
            default: null,
        },
        movementStart: {
            type: Date,
            default: null,
        },
        movementEnd: {
            type: Date,
            default: null,
        },
    }
},{timestamps: true});

const IntraMovement = mongoose.model("IntraMovement", intraMovementSchema);

export default IntraMovement;