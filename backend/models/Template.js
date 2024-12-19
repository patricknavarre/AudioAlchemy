const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['aggressive', 'commercial', 'cinematic', 'custom'],
    required: true,
  },
  settings: {
    compression: {
      threshold: Number,
      ratio: Number,
      attack: Number,
      release: Number
    },
    eq: [{
      frequency: Number,
      gain: Number,
      q: Number
    }],
    reverb: {
      roomSize: Number,
      dampening: Number,
      wetLevel: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Template', templateSchema); 