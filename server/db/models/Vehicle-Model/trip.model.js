import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
  material: String,
  quantity: Number,
  invoiceNo: String,
  unit: String,
  invoiceAmmount: Number,
  customer: String
}, { _id: false });

const TripSchema = new mongoose.Schema({

  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Vehicle",
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ["internal_transfer", "external_delivery"],
    required: true,
    index: true
  },

  phase: {
    type: String,
    enum: ["ORIGIN", "DESTINATION"],
    default: "ORIGIN",
    index: true
  },
  
  location: {
    type: String,
    enum: ["inside_factory", "enroute", "outside_factory"],
    default: "outside_factory",
    index: true
  },

  status: {
    type: String,
    enum: ["ORIGIN", "IN_TRANSIT", "ARRIVED", "DESTINATION" ],
    default: "ORIGIN",
    index: true
  },

  tripState: {
    type: String,
    enum: [ "ACTIVE", "COMPLETED", "CLOSED", "CANCELLED"],
    default: "ACTIVE",
    index: true,
  },

  sourceFactoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
    index: true
  },

  destinationFactoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
    default: null,
    index: true
  },

  currentFactoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
    default: null,
    index: true
  },

  purpose: String,

  loadStatus: {
    type: String,
    enum: ["pending", "loaded", "unloaded"],
    default: "pending"
  },


  materials: [materialSchema],

  startedAt: Date,
  completedAt: Date,
  createdBy: String ,

  tripHistory: [{
    status: String,
    location: String,
    Phase: String,
    action:{
      type: String,
      enum: ["begin","checkin", "checkout", "load", "unload", "cancel", "complete"]
    },
    timestamp: Date
  }]

}, { timestamps: true });


TripSchema.index({ vehicleId: 1, status: 1 });
TripSchema.index({ sourceFactoryId: 1, status: 1 });
TripSchema.index({ destinationFactoryId: 1, status: 1 });
TripSchema.index({ createdAt: -1 });

export default mongoose.model("Trip", TripSchema);