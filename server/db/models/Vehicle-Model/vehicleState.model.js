import mongoose from "mongoose";

const VehicleStateSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", unique: true },

  currentFactoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },

  status: {
    type: String,
    enum: ["idle", "waiting_outside", "in_transit", "inside_factory"],
    index: true
  },

  currentTripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip"
  }

}, { timestamps: true });

export default mongoose.model("VehicleState", VehicleStateSchema);