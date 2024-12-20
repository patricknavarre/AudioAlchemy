const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const projectController = require('../controllers/projectController');
const Project = require('../models/Project');
const path = require('path');

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

// Test route - no auth required for testing
router.post('/test-upload', projectController.createProject);
router.get('/test/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('Error fetching test project:', error);
    res.status(500).json({ message: 'Error fetching project', error: error.message });
  }
});

// Protected routes
router.post('/', auth, projectController.createProject);
router.get('/', auth, projectController.getProjects);
router.get('/:id', auth, projectController.getProject);
router.post('/:id/render', auth, projectController.renderMix);
router.post('/:id/mix', auth, projectController.mixProject);

// File serving routes - these need to be before the :id routes to avoid conflicts
router.get('/mixed/:filename', auth, projectController.serveMixedFile);
router.get('/processed/:filename', auth, projectController.serveProcessedFile);
router.get('/download/mixed/:filename', auth, projectController.downloadMixByFilename);

// Project-specific download route
router.get('/:id/download', auth, projectController.downloadMix);

module.exports = router; 