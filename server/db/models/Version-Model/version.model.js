import mongoose from "mongoose";

const versionSchema = new mongoose.Schema({
  versionNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  buildNumber: {
    type: Number,
    trim: true
  },

  releaseDate: {
    type: Date,
    default: Date.now
  },

  title: {
    type: String,
    trim: true
  },

  description: {
    type: String
  },

  features: [
    {
      title: String,
      description: String
    }
  ],

  bugFixes: [String],

  isForceUpdate: {
    type: Boolean,
    default: false
  },

  platform: {
    type: String,
    enum: ["web", "android", "ios"],
    default: "web"
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

const Version = mongoose.model("Version", versionSchema);

export default Version;