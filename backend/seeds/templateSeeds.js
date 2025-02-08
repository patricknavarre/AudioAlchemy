const mongoose = require("mongoose");
const Template = require("../models/Template");
require("dotenv").config();

const defaultTemplates = [
  {
    name: "Aggressive Mix",
    description: "Heavy compression and EQ for impactful sound",
    type: "aggressive",
    settings: {
      compression: {
        threshold: -24,
        ratio: 4,
        attack: 10,
        release: 40,
      },
      eq: [
        { frequency: 100, gain: 3, q: 1 },
        { frequency: 1000, gain: -2, q: 0.7 },
        { frequency: 5000, gain: 4, q: 0.5 },
      ],
      reverb: {
        roomSize: 0.3,
        dampening: 8000,
        wetLevel: 0.2,
      },
    },
  },
  {
    name: "Commercial Mix",
    description: "Balanced settings for broadcast-ready sound",
    type: "commercial",
    settings: {
      compression: {
        threshold: -18,
        ratio: 2.5,
        attack: 15,
        release: 60,
      },
      eq: [
        { frequency: 80, gain: -1, q: 0.7 },
        { frequency: 2000, gain: 2, q: 0.5 },
        { frequency: 10000, gain: 1, q: 0.7 },
      ],
      reverb: {
        roomSize: 0.2,
        dampening: 6000,
        wetLevel: 0.15,
      },
    },
  },
  {
    name: "Cinematic Mix",
    description: "Wide, spacious mix for film and video",
    type: "cinematic",
    settings: {
      compression: {
        threshold: -20,
        ratio: 2,
        attack: 20,
        release: 100,
      },
      eq: [
        { frequency: 60, gain: 2, q: 1 },
        { frequency: 400, gain: -1, q: 0.5 },
        { frequency: 8000, gain: 3, q: 0.7 },
      ],
      reverb: {
        roomSize: 0.6,
        dampening: 4000,
        wetLevel: 0.3,
      },
    },
  },
  {
    name: "TV Commercial (Bright)",
    description: "Punchy and bright mix optimized for TV commercials",
    type: "commercial",
    settings: {
      compression: {
        threshold: -16,
        ratio: 3,
        attack: 5,
        release: 50,
      },
      eq: [
        { frequency: 120, gain: -2, q: 0.8 },
        { frequency: 3000, gain: 4, q: 0.6 },
        { frequency: 12000, gain: 3, q: 0.5 },
      ],
      reverb: {
        roomSize: 0.15,
        dampening: 7000,
        wetLevel: 0.1,
      },
    },
  },
  {
    name: "TV Drama",
    description: "Intimate and clear mix for dramatic television content",
    type: "cinematic",
    settings: {
      compression: {
        threshold: -22,
        ratio: 2.2,
        attack: 25,
        release: 150,
      },
      eq: [
        { frequency: 90, gain: 1, q: 0.9 },
        { frequency: 800, gain: -1.5, q: 0.6 },
        { frequency: 4000, gain: 2, q: 0.7 },
        { frequency: 10000, gain: 1.5, q: 0.8 },
      ],
      reverb: {
        roomSize: 0.4,
        dampening: 5000,
        wetLevel: 0.25,
      },
    },
  },
  {
    name: "Action Movie",
    description: "Dynamic and powerful mix for action sequences",
    type: "cinematic",
    settings: {
      compression: {
        threshold: -25,
        ratio: 3.5,
        attack: 8,
        release: 80,
      },
      eq: [
        { frequency: 40, gain: 4, q: 1.2 },
        { frequency: 150, gain: 2, q: 0.8 },
        { frequency: 2500, gain: 3, q: 0.6 },
        { frequency: 8000, gain: 2.5, q: 0.7 },
      ],
      reverb: {
        roomSize: 0.5,
        dampening: 3500,
        wetLevel: 0.35,
      },
    },
  },
  {
    name: "Documentary",
    description: "Natural and clear mix emphasizing dialogue and ambience",
    type: "cinematic",
    settings: {
      compression: {
        threshold: -20,
        ratio: 1.8,
        attack: 30,
        release: 200,
      },
      eq: [
        { frequency: 70, gain: -1, q: 0.7 },
        { frequency: 250, gain: -1, q: 0.6 },
        { frequency: 2000, gain: 1.5, q: 0.5 },
        { frequency: 6000, gain: 1, q: 0.8 },
      ],
      reverb: {
        roomSize: 0.3,
        dampening: 5500,
        wetLevel: 0.2,
      },
    },
  },
  {
    name: "Comedy Show",
    description: "Bright and present mix optimized for comedy content",
    type: "commercial",
    settings: {
      compression: {
        threshold: -18,
        ratio: 2,
        attack: 12,
        release: 70,
      },
      eq: [
        { frequency: 100, gain: -1.5, q: 0.8 },
        { frequency: 1500, gain: 2, q: 0.6 },
        { frequency: 4000, gain: 3, q: 0.5 },
        { frequency: 9000, gain: 1.5, q: 0.7 },
      ],
      reverb: {
        roomSize: 0.25,
        dampening: 6500,
        wetLevel: 0.15,
      },
    },
  },
  {
    name: "Broadcast News",
    description: "Clean and intelligible mix for news broadcasting",
    type: "commercial",
    settings: {
      compression: {
        threshold: -16,
        ratio: 2.5,
        attack: 10,
        release: 50,
      },
      eq: [
        { frequency: 80, gain: -2, q: 0.9 },
        { frequency: 400, gain: -1, q: 0.7 },
        { frequency: 2500, gain: 3, q: 0.5 },
        { frequency: 7000, gain: 1.5, q: 0.6 },
      ],
      reverb: {
        roomSize: 0.1,
        dampening: 8000,
        wetLevel: 0.08,
      },
    },
  },
];

async function seedTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clear existing templates
    await Template.deleteMany({});

    // Insert default templates
    await Template.insertMany(defaultTemplates);

    console.log("Templates seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding templates:", error);
    process.exit(1);
  }
}

// Run seeder if this file is run directly
if (require.main === module) {
  seedTemplates();
}

module.exports = seedTemplates;
