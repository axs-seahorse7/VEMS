import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  supportsBlocks: {
    type: Boolean,
    default: false
  },

  allowedBlocks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Block"
  }],

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
});

const Site = mongoose.model("Site", siteSchema);
export default Site;