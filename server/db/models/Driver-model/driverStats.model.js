import mongoose from "mongoose";

const driverTripSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    index: true
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip"
  },
  tripDate: Date
}, { timestamps: true });