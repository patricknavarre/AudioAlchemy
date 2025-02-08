const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  originalPath: String,
  processedPath: String,
  type: String,
  size: Number,
  stemType: String,
  analysis: {
    issues: {
      muddy: Boolean,
      harsh: Boolean,
      phaseCancellation: Boolean,
      excessiveStereoWidth: Boolean,
      dynamicsIssues: Boolean,
    },
    frequency: {
      bands: {
        lowMids: {
          energy: Number,
          centroid: Number,
        },
        presence: {
          energy: Number,
          peak_freq: Number,
        },
      },
      spectralFeatures: {
        flatness: Number,
      },
    },
    dynamics: {
      crestFactor: Number,
    },
    stereo: {
      correlation: Number,
      width_ratio: Number,
    },
    rhythm: {
      transientDensity: Number,
    },
  },
  processing: {
    filters: [
      {
        filter: String,
        options: mongoose.Schema.Types.Mixed,
      },
    ],
    improvements: {
      dynamics: String,
      frequency: String,
      stereo: String,
      noise: String,
      phase: String,
    },
  },
});

const mixedFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mixStyle: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  files: [fileSchema],
  mixedFile: mixedFileSchema,
  status: {
    type: String,
    enum: ["uploading", "processing", "ready", "error"],
    default: "uploading",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Project", projectSchema);
