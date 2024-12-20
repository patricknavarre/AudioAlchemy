const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const projectController = require('../controllers/projectController');
const Project = require('../models/Project');
const path = require('path');
const fs = require('fs');

// Debug middleware for all project routes
router.use((req, res, next) => {
  console.log('Project Route Request:', {
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params,
    body: req.method === 'POST' ? req.body : undefined,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[exists]' : '[missing]'
    },
    files: req.files ? req.files.length : 0
  });
  next();
});

// Project routes
router.post('/', auth, projectController.createProject);
router.get('/', auth, projectController.getProjects);
router.get('/:id', auth, projectController.getProject);
router.put('/:id/mix-settings', auth, projectController.updateMixSettings);
router.post('/:id/mix', auth, projectController.mixProject);
router.get('/:id/download', auth, projectController.downloadMix);

// File serving routes
router.get('/processed/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads/processed', req.params.filename);
  console.log('Serving processed file:', {
    requestedPath: filePath,
    exists: fs.existsSync(filePath)
  });
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

router.get('/mixed/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads/mixed', req.params.filename);
  console.log('Serving mixed file:', {
    requestedPath: filePath,
    exists: fs.existsSync(filePath)
  });
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Project route error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers
  });
  res.status(500).json({ message: err.message });
});

module.exports = router; 