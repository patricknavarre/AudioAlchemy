require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const auth = require('./middleware/auth');

// Import models
require('./models/User');

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://audioalchemy.onrender.app',
  'https://audio-alchemy-git-main-patricknavarres-projects.vercel.app',
  'https://audioalchemy.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Origin not allowed by CORS:', origin);
      return callback(null, false);
    }
    console.log('Origin allowed by CORS:', origin);
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route for connectivity
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is running',
    environment: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    timestamp: new Date().toISOString(),
    mongoState: mongoose.connection.readyState
  });
});

// Create required directories
const dirs = ['uploads', 'uploads/stems', 'uploads/processed', 'uploads/mixed'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Database connection
console.log('Attempting to connect to MongoDB with URI:', process.env.MONGODB_URI ? '[URI exists]' : '[URI missing]');

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  dbName: 'audioalchemy'
};

// Initialize server after MongoDB connects
const initializeServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('Successfully connected to MongoDB');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('MongoDB connection details:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      models: Object.keys(mongoose.models)
    });

    // Set up routes only after successful MongoDB connection
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/projects', require('./routes/projects'));
    app.use('/api/templates', require('./routes/templates'));

    // Rest of your route handlers...
    // [Previous route handlers for audio files remain the same]

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Global error handler:', {
        error: err.message,
        stack: err.stack,
        mongoState: mongoose.connection.readyState
      });
      res.status(500).json({ 
        message: 'Something broke!', 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('CORS origin:', process.env.CORS_ORIGIN || 'http://localhost:5173');
      console.log('MongoDB state:', mongoose.connection.readyState);
    });
  } catch (error) {
    console.error('Failed to initialize server:', {
      error: error.message,
      stack: error.stack,
      mongoState: mongoose.connection.readyState
    });
    process.exit(1);
  }
};

// Monitor MongoDB connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error event:', {
    error: err.message,
    stack: err.stack,
    mongoState: mongoose.connection.readyState
  });
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, connection state:', mongoose.connection.readyState);
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected, connection state:', mongoose.connection.readyState);
});

// Start the server
initializeServer().catch(error => {
  console.error('Server initialization failed:', error);
  process.exit(1);
});