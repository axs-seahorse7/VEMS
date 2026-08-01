import mongoose from "mongoose";

const blockSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    { timestamps: true }
);

const Block = mongoose.model("Block", blockSchema);
export default Block;