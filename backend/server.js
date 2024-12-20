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
  'https://audioalchemy.vercel.app',
  'https://audioalchemy-frontend.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    console.log('Incoming request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin provided, allowing request');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Origin not allowed by CORS:', origin);
      console.log('Allowed origins:', allowedOrigins);
      // During development, we'll allow all origins
      if (process.env.NODE_ENV !== 'production') {
        console.log('Development mode - allowing unknown origin');
        return callback(null, true);
      }
      console.log('Production mode - checking origin:', origin);
      if (origin.includes('vercel.app') || origin.includes('render.com')) {
        console.log('Allowing Vercel/Render domain:', origin);
        return callback(null, true);
      }
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

// Handle preflight requests
app.options('*', cors());

// Increase payload size limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory with CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Add routes for serving processed and mixed files
app.get('/api/projects/processed/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads/processed', req.params.filename);
  console.log('Serving processed file:', {
    requestedPath: filePath,
    exists: fs.existsSync(filePath)
  });
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

app.get('/api/projects/mixed/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads/mixed', req.params.filename);
  console.log('Serving mixed file:', {
    requestedPath: filePath,
    exists: fs.existsSync(filePath)
  });
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    mongoState: mongoose.connection.readyState,
    headers: req.headers,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined
  });
  res.status(500).json({ 
    message: 'Something broke!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    mongoState: mongoose.connection.readyState
  });
});

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

// After the imports
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

// Initialize server after MongoDB connects
const initializeServer = async () => {
  try {
    console.log('Connecting to MongoDB with options:', {
      ...mongooseOptions,
      uri: process.env.MONGODB_URI ? '[URI exists]' : '[URI missing]'
    });

    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('Successfully connected to MongoDB');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('MongoDB connection details:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      models: Object.keys(mongoose.models),
      readyState: mongoose.connection.readyState,
      collections: Object.keys(mongoose.connection.collections)
    });

    // Set up routes only after successful MongoDB connection
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/projects', require('./routes/projects'));
    app.use('/api/templates', require('./routes/templates'));

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('CORS origin:', process.env.CORS_ORIGIN || 'http://localhost:5173');
      console.log('MongoDB state:', mongoose.connection.readyState);
      console.log('Environment:', process.env.NODE_ENV);
    });
  } catch (error) {
    console.error('Failed to initialize server:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
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