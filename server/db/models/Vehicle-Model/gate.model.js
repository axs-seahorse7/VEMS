import mongoose from "mongoose";

const GateLogSchema = new mongoose.Schema({

  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Vehicle",
    required: true,
    index: true
  },

  factoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
    required: true,
    index: true
  },

  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    default: null,
    index: true
  },

  action: {
    type: String,
    enum: ["waiting","checkin", "checkout", "unload", "load"],
    required: true,
    index: true
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  doneBy: String // guard ID later

}, { timestamps: true });

GateLogSchema.index({ factoryId: 1, action: 1, timestamp: -1 });

export default mongoose.model("GateLog", GateLogSchema);