import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema({
  event: {
    type: String,
    enum: [
      "CREATED",
      "GATE_IN",
      "CHECK_IN",
      "LOADING_START",
      "LOADING_END",
      "UNLOADING_START",
      "UNLOADING_END",
      "CHECK_OUT",
      "DISPATCHED"
    ],
  },
  phase: {
    type: String,
    enum: ["ORIGIN", "DESTINATION"],
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
  },
  note: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const routeSchema = new mongoose.Schema({
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const tripSchema = new mongoose.Schema({
  fromLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
  },
  toLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Factory",
  },

  status: {
    type: String,
    enum: ["enroute", "inside", "completed", "waiting"],
    default: "enroute",
  },

  tripStage: {
  type: String,
  enum: [
    "GATE",
    "INSIDE",
    "LOADING",
    "READY_TO_DISPATCH",
    "DISPATCHED",
    "ENROUTE"
    ],
    default: "GATE"
  },

  route: [routeSchema],       // movement history
  timeline: [timelineSchema], // event history

  // timestamps
  entryTimeAtFactory: Date,
  arrivalTimeAtFactory: Date,
  dispatchTimeFromFactory: Date,
  isInternalShift: { type: Boolean, default: false },
  isVanInside: { type: Boolean, default: false },
}, { timestamps: true });

const vanSchema = new mongoose.Schema({

  // 🔹 Driver
  driverName: { type: String, required: true },
  driverContact: { type: String, required: true },
  driverIdType: { type: String, required: true },
  driverIdNumber: { type: String, required: true },

  // 🔹 Vehicle
  vehicleNumber: { type: String, required: true, unique: true },
  transporterName: { type: String, required: true },
  vehicleType: { type: String, required: true },
  PUCEndDate: { type: Date, required: true },
  isInternalvehicle: { type: Boolean, default: false },
  isVanInside: { type: Boolean, default: false },

  // 🔹 Cargo
  goodsType: [String],
  materialType: [String],
  materialQuantity: [Number],
  purpose: { type: String, required: true },

  // 🔹 CURRENT STATE (fast access fields)
  currentTrip: tripSchema,   // 👈 ACTIVE TRIP
  tripHistory: [tripSchema], // 👈 ALL OLD TRIPS

}, { timestamps: true });

export default mongoose.model("Van", vanSchema);