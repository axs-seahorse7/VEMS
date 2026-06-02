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

   purpose:String,

   segmentNumber: {
      type: Number,
      required: true
   },

   externalSource: String, 
   externalDestination: String,

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

   materials:{
      name:String,
      material: String,
      quantity: Number,
      invoiceNo: String,
      unit: String,
      invoiceAmount: Number,
      seal: String,
      customer: String,
      supplier: String,
   },

   startedAt: Date,

   completedAt: Date,

   status: {
      type: String,
      enum: [
         "ACTIVE",
         "COMPLETED",
         "CANCELLED",
         "ROUTE_CHANGED",
         "CLOSED",
         "CANCELLED"
      ],
      default: "ACTIVE"
   },

   routeChangeReason: String

}, { timestamps:true });

const TripSegment = mongoose.model('TripSegment', tripSegmentSchema);

export default TripSegment;