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

// CORS configuration - must be first
const corsOptions = {
  origin: function(origin, callback) {
    console.log('Incoming request from origin:', origin);
    // Allow all origins during development/testing
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Pre-flight requests
app.options('*', cors(corsOptions));

// Add request logging
app.use((req, res, next) => {
  console.log('Request:', {
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[exists]' : '[missing]'
    }
  });
  next();
});

// Add response logging
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    console.log('Response:', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      headers: res.getHeaders()
    });
    return originalSend.call(this, data);
  };
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Routes setup
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/templates', require('./routes/templates'));

// Static file serving
app.use('/uploads', express.static(UPLOAD_DIR));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers
  });
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    status: err.status || 500
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

// Test route for connectivity
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is running',
    environment: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    timestamp: new Date().toISOString(),
    mongoState: mongoose.connection.readyState,
    headers: req.headers,
    origin: req.get('origin'),
    host: req.get('host')
  });
});

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