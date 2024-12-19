const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalPath: {
    type: String,
    required: true
  },
  processedPath: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  stemType: {
    type: String,
    required: true
  }
});

const mixedFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  mixStyle: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  files: [fileSchema],
  mixedFile: mixedFileSchema,
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error'],
    default: 'uploading'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Project', projectSchema); 