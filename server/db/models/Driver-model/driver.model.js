import mongoose from "mongoose";

const driverSchema = new mongoose.Schema({
    driverName: { type: String, required: true },
    driverContact: { type: String, required: true },
    driverIdType: { type: String, required: true },
    driverIdNumber: { type: String, required: true },
    licenseNumber: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    stats : [{
        date: { type: Date, default: Date.now },
        tripsCompleted: { type: Number, default: 0 },
        incidentsReported: { type: Number, default: 0 },
        routeHistory: [{
            sourceFactory: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
            destinationFactory: { type: mongoose.Schema.Types.ObjectId, ref: "Factory" },
            tripPurpose: { type: String },
            tripDate: { type: Date }
        }]
    }]

}, { timestamps: true });

const Driver = mongoose.model("Driver", driverSchema);
export default Driver;