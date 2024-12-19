require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const auth = require('./middleware/auth');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create required directories
const dirs = ['uploads', 'uploads/stems', 'uploads/processed', 'uploads/mixed'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/templates', require('./routes/templates'));

// Serve mixed audio files
app.get('/audio/mixed/:filename', auth, (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads/mixed', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving audio:', error);
    res.status(500).send('Error serving audio file');
  }
});

// Download mixed file
app.get('/download/mixed/:filename', auth, (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads/mixed', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    res.download(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Error downloading file');
  }
});

// Update the static file serving configuration
app.use('/audio', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    console.log('Serving audio file:', filePath);
    if (filePath.endsWith('.wav')) {
      res.set({
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
    }
  }
}));

// Add OPTIONS handler for preflight requests
app.options('/api/processed/:filename', cors());

// Add a dedicated endpoint for processed files with auth
app.get('/api/processed/:filename', auth, (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads', 'processed', req.params.filename);
    console.log('Serving processed file:', filePath);
    console.log('Auth headers:', req.headers.authorization);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    // Set common headers
    const headers = {
      'Accept-Ranges': 'bytes',
      'Content-Type': 'audio/wav',
      'Cache-Control': 'no-cache'
    };

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': chunksize
      });

      fs.createReadStream(filePath, {start, end}).pipe(res);
    } else {
      res.writeHead(200, {
        ...headers,
        'Content-Length': stat.size
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Error serving processed file:', error);
    res.status(500).send('Error serving file');
  }
});

// Add OPTIONS handler for mixed files
app.options('/api/mixed/:filename', cors());

// Add a dedicated endpoint for mixed files with auth
app.get('/api/mixed/:filename', auth, async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'uploads/mixed', req.params.filename);
    
    // Log detailed request info
    console.log('Mixed file request:', {
      requestedFile: req.params.filename,
      fullPath: filePath,
      exists: fs.existsSync(filePath),
      size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
      directory: path.dirname(filePath),
      directoryExists: fs.existsSync(path.dirname(filePath)),
      directoryContents: fs.existsSync(path.dirname(filePath)) ? 
        fs.readdirSync(path.dirname(filePath)) : [],
      auth: !!req.headers.authorization
    });
    
    if (!fs.existsSync(filePath)) {
      console.error('Mixed file not found:', {
        requestedPath: filePath,
        directory: path.dirname(filePath),
        directoryExists: fs.existsSync(path.dirname(filePath)),
        availableFiles: fs.existsSync(path.dirname(filePath)) ? 
          fs.readdirSync(path.dirname(filePath)) : []
      });
      return res.status(404).send('File not found');
    }

    // Try to read file stats
    const stat = fs.statSync(filePath);
    console.log('File stats:', {
      size: stat.size,
      mode: stat.mode,
      uid: stat.uid,
      gid: stat.gid,
      accessTime: stat.atime,
      modifyTime: stat.mtime,
      changeTime: stat.ctime
    });

    const range = req.headers.range;
    const headers = {
      'Accept-Ranges': 'bytes',
      'Content-Type': 'audio/wav',
      'Cache-Control': 'no-cache'
    };

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': chunksize
      });

      fs.createReadStream(filePath, {start, end})
        .on('error', (err) => {
          console.error('Stream error:', err);
          res.end();
        })
        .pipe(res);
    } else {
      res.writeHead(200, {
        ...headers,
        'Content-Length': stat.size
      });

      fs.createReadStream(filePath)
        .on('error', (err) => {
          console.error('Stream error:', err);
          res.end();
        })
        .pipe(res);
    }
  } catch (error) {
    console.error('Error serving mixed file:', error);
    res.status(500).send('Error serving file');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something broke!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS origin:', process.env.CORS_ORIGIN || 'http://localhost:5173');
}); 