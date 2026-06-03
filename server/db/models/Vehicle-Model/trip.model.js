  import mongoose from "mongoose";

  const materialSchema = new mongoose.Schema({
    name:String,
    material: String,
    quantity: Number,
    invoiceNo: String,
    unit: String,
    invoiceAmount: Number,
    seal: String,
    customer: String,
    supplier: String,
  }, { _id: false });

  const TripSchema = new mongoose.Schema({
    currentSegment: {
      type: mongoose.Schema.Types.ObjectId,
      ref:"TripSegment"
    },
    vehicleId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Vehicle",
      required: true,
    },

    type: {
      type: String,
      enum: ["internal_transfer", "external_delivery"],
      required: true,
      index: true
    },

    phase: {
      type: String,
      enum: ["ORIGIN", "DESTINATION", "ROUTE_UPDATE"],
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
      enum: ["ORIGIN", "IN_TRANSIT", "ROUTE_CHANGED", "ARRIVED", "DESTINATION" ],
      default: "ORIGIN",
      index: true
    },

    tripState: {
      type: String,
      enum: [ "ACTIVE", "COMPLETED", "CLOSED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },

    

    externalSource: String,  
    externalDestination: String, 

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

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
      index: true
    },

    purpose: String,

    reason:{
      type: String,
    },

    loadStatus: {
      type: String,
      enum: ["pending", "loaded", "unloaded"],
      default: "pending"
    },


    materials: [materialSchema],

    startedAt: Date,
    arrivedAt: Date, 
    checkedInAt: {
      type: Date,
      default: null,
    }, 
    completedAt: Date,
    createdBy: String ,

    tripHistory: [{
      status: String,
      location: String,
      phase: String,
      actionBy: String,
      actionLocation: String,
      factoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
      action:{
        type: String,
        enum: ["begin", "arrived", "checkin", "checkout", "load", "unload", "cancelled", "complete", "closed", "route_change"]
      },
      timestamp: Date,
      segment: {
        movementType: String,
        externalSource: String,
        externalDestination: String,
        sourceFactoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
        destinationFactoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
        startedAt: Date,
        completedAt: Date
      },
      tripSegmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TripSegment"
      }
    }]

  }, { timestamps: true });


  TripSchema.index({vehicleId: 1},{
      unique: true,
      partialFilterExpression: {
        tripState: {
          $in: ["ACTIVE"]
        }
      }
    }
  );
  TripSchema.index({ sourceFactoryId: 1, status: 1 });
  TripSchema.index({ destinationFactoryId: 1, status: 1 });
  TripSchema.index({ createdAt: -1 });

  export default mongoose.model("Trip", TripSchema);