import mongoose from "mongoose";

const driverSchema = new mongoose.Schema({
  driverName:       { type: String, required: true },
  driverContact:    { type: String, required: true },
  driverIdType:     { type: String, required: true },
  driverIdNumber:   { type: String, required: true, unique: true },
  licenseNumber:    { type: String, required: true, unique: true },
  assignedVehicle:  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    default: null
  },
  activeTripId:     {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    default: null
  },
  stats: {
    totalTrips:     { type: Number, default: 0 },
    totalDistance:  { type: Number, default: 0 },
    totalTime:      { type: Number, default: 0 },
    routeHistory:   [
      {
        tripId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Trip"
        },
        tripDate: { type: Date }
      }
    ]
  }

}, { timestamps: true });

const Driver = mongoose.model("Driver", driverSchema);
export default Driver;