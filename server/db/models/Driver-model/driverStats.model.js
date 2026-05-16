import mongoose from "mongoose";

const DriverTripHistorySchema =
new mongoose.Schema({

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
    index: true
  },

  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    required: true,
    index: true
  },

  startedAt: {
    type: Date,
    default: Date.now
  },

  completedAt: {
    type: Date,
    default: null
  }

}, {
  timestamps: true
});

DriverTripHistorySchema.index(
  {
    driverId: 1,
    tripId: 1
  },
  {
    unique: true
  }
);

export default mongoose.model("DriverTripHistory", DriverTripHistorySchema);