import mongoose from "mongoose";

const VehicleSchema = new mongoose.Schema({
  vehicleNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },

  type: { 
    type: String, 
    enum: ["internal", "external"], 
    required: true,
    index: true
  },

  ownerFactoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Factory",
    default: null,
    index: true
  },

  typeOfVehicle: {
    type: String,
    required: true,
    index: true
  },

  currentTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    default: null
  },

  currentFactoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
    default: null,
    index: true
  },
  
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },


  // not in use, but keeping for future reference
  driverName: String,
  driverContact: String,
  transporterName: String,
  driverIdType: String,
  driverIdNumber: String,
  purpose: String,
  PUCExpiry: Date,

  isActive: { type: Boolean, default: true }

}, { timestamps: true });

export default mongoose.model("Vehicle", VehicleSchema);