require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const { createUploadDirectories } = require('./utils/fileUtils');
const app = require('./server');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('Starting server initialization...');
    
    // Ensure upload directories exist
    await createUploadDirectories();
    console.log('Upload directories created/verified');

    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB connection established');

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Environment:', process.env.NODE_ENV);
      console.log('CORS origin:', process.env.CORS_ORIGIN);
      console.log('Frontend URL:', process.env.FRONTEND_URL);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer(); 