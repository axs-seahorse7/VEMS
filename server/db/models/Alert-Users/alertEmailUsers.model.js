import mongoose from 'mongoose';

const alertEmailUsersSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
         required: true
    },
    factoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Factory",
        required: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

export const AlertEmailUsers = mongoose.model("AlertEmailUsers", alertEmailUsersSchema);