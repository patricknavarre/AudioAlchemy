require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const auth = require('./middleware/auth');

// Import models
require('./models/User');

// Define upload directories first
const UPLOAD_DIR = process.env.NODE_ENV === 'production' ? '/tmp/audioalchemy' : path.join(__dirname, 'uploads');
const STEMS_DIR = path.join(UPLOAD_DIR, 'stems');
const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed');
const MIXED_DIR = path.join(UPLOAD_DIR, 'mixed');

// Create required directories with permission checks
const dirs = [UPLOAD_DIR, STEMS_DIR, PROCESSED_DIR, MIXED_DIR];
dirs.forEach(dir => {
  const dirPath = path.resolve(dir);
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o777 });
      console.log(`Created directory: ${dirPath}`);
    }
    // Check if directory is writable
    fs.accessSync(dirPath, fs.constants.W_OK);
    console.log(`Directory ${dirPath} exists and is writable`);
    
    // Log directory permissions
    const stats = fs.statSync(dirPath);
    console.log(`Directory ${dirPath} permissions:`, {
      mode: stats.mode,
      uid: stats.uid,
      gid: stats.gid,
      isDirectory: stats.isDirectory(),
      isWritable: Boolean(stats.mode & fs.constants.W_OK),
      absolutePath: path.resolve(dirPath),
      freeSpace: fs.statfsSync(dirPath).bfree * fs.statfsSync(dirPath).bsize
    });
  } catch (error) {
    console.error(`Error with directory ${dirPath}:`, {
      error: error.message,
      code: error.code,
      stack: error.stack,
      attempted: {
        path: dirPath,
        absolutePath: path.resolve(dirPath)
      }
    });
    process.exit(1);
  }
});

const app = express();

// Basic CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://audio-alchemy-git-main-patricknavarres-projects.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Basic error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Body parsing middleware - BEFORE routes
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/templates', require('./routes/templates'));

// Static files
app.use('/uploads', express.static(UPLOAD_DIR));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    cors: {
      origin: req.headers.origin,
      method: req.method
    }
  });
});

// Initialize server after MongoDB connects
const initializeServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('Connected to MongoDB');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Environment:', process.env.NODE_ENV);
    });
  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
};

// Add temporary file upload endpoint for testing
app.post('/api/test-upload', express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req, res) => {
  try {
    const testFile = path.join(__dirname, 'uploads', 'test.txt');
    fs.writeFileSync(testFile, 'Test file content');
    console.log('Test file created successfully:', {
      path: testFile,
      exists: fs.existsSync(testFile),
      stats: fs.statSync(testFile)
    });
    res.json({ message: 'Test file created successfully' });
  } catch (error) {
    console.error('Test file creation error:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

// Database connection
console.log('Environment check:', {
  nodeEnv: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET ? '[exists]' : '[missing]',
  mongoUri: process.env.MONGODB_URI ? '[exists]' : '[missing]',
  port: process.env.PORT || 5000
});

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment variables');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  dbName: 'itMix'
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