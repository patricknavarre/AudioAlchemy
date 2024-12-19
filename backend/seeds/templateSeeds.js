const mongoose = require('mongoose');
const Template = require('../models/Template');
require('dotenv').config();

const defaultTemplates = [
  {
    name: 'Aggressive Mix',
    description: 'Heavy compression and EQ for impactful sound',
    type: 'aggressive',
    settings: {
      compression: {
        threshold: -24,
        ratio: 4,
        attack: 10,
        release: 40
      },
      eq: [
        { frequency: 100, gain: 3, q: 1 },
        { frequency: 1000, gain: -2, q: 0.7 },
        { frequency: 5000, gain: 4, q: 0.5 }
      ],
      reverb: {
        roomSize: 0.3,
        dampening: 8000,
        wetLevel: 0.2
      }
    }
  },
  {
    name: 'Commercial Mix',
    description: 'Balanced settings for broadcast-ready sound',
    type: 'commercial',
    settings: {
      compression: {
        threshold: -18,
        ratio: 2.5,
        attack: 15,
        release: 60
      },
      eq: [
        { frequency: 80, gain: -1, q: 0.7 },
        { frequency: 2000, gain: 2, q: 0.5 },
        { frequency: 10000, gain: 1, q: 0.7 }
      ],
      reverb: {
        roomSize: 0.2,
        dampening: 6000,
        wetLevel: 0.15
      }
    }
  },
  {
    name: 'Cinematic Mix',
    description: 'Wide, spacious mix for film and video',
    type: 'cinematic',
    settings: {
      compression: {
        threshold: -20,
        ratio: 2,
        attack: 20,
        release: 100
      },
      eq: [
        { frequency: 60, gain: 2, q: 1 },
        { frequency: 400, gain: -1, q: 0.5 },
        { frequency: 8000, gain: 3, q: 0.7 }
      ],
      reverb: {
        roomSize: 0.6,
        dampening: 4000,
        wetLevel: 0.3
      }
    }
  }
];

async function seedTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear existing templates
    await Template.deleteMany({});
    
    // Insert default templates
    await Template.insertMany(defaultTemplates);
    
    console.log('Templates seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

// Run seeder if this file is run directly
if (require.main === module) {
  seedTemplates();
}

module.exports = seedTemplates; 