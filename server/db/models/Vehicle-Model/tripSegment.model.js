import mongoose from 'mongoose';

const tripSegmentSchema = new mongoose.Schema({
   tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true
   },
   triptype: {
      type: String,
      enum: ["INTERNAL", "EXTERNAL"],
        default: "INTERNAL",
   },

   segmentNumber: {
      type: Number,
      required: true
   },

   externalSource: String,   // for external deliveries
   externalDestination: String, // for external deliveries

   sourceFactoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Factory"
   },

   destinationFactoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Factory"
   },

   vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle"
   },

   driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver"
   },

   startedAt: Date,

   completedAt: Date,

   status: {
      type: String,
      enum: [
         "ACTIVE",
         "COMPLETED",
         "CANCELLED",
         "ROUTE_CHANGED"
      ]
   },

   routeChangeReason: String

}, { timestamps:true });

const TripSegment = mongoose.model('TripSegment', tripSegmentSchema);

export default TripSegment;