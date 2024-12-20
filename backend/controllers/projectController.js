const Project = require('../models/Project');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
const fsSync = require('fs');
const audioProcessor = require('../services/audioProcessor');
const mongoose = require('mongoose');
const os = require('os');

// At the top of the file
const UPLOAD_DIR = process.env.NODE_ENV === 'production' ? '/tmp/audioalchemy' : path.join(__dirname, '../uploads');
const STEMS_DIR = path.join(UPLOAD_DIR, 'stems');
const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed');
const MIXED_DIR = path.join(UPLOAD_DIR, 'mixed');

// Ensure required directories exist with proper permissions
const ensureDirectories = async () => {
  const dirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/stems'),
    path.join(__dirname, '../uploads/processed'),
    path.join(__dirname, '../uploads/mixed')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true, mode: 0o755 });
      console.log('Directory created/verified:', dir);
      
      // Verify directory permissions
      await fs.access(dir, fs.constants.W_OK);
      console.log('Directory is writable:', dir);
      
      const stats = await fs.stat(dir);
      console.log('Directory permissions:', {
        path: dir,
        mode: stats.mode.toString(8),
        uid: stats.uid,
        gid: stats.gid
      });
    } catch (error) {
      console.error('Error creating/verifying directory:', {
        dir,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
};

// Configure multer for stem uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    console.log('Multer destination handler:', {
      file: {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype
      },
      headers: req.headers,
      uploadDir: STEMS_DIR,
      freeSpace: fs.statfsSync('/tmp').bfree * fs.statfsSync('/tmp').bsize
    });

    try {
      await fs.mkdir(STEMS_DIR, { recursive: true, mode: 0o777 });
      console.log('Upload directory created/verified:', STEMS_DIR);
      
      // Verify directory permissions
      await fs.access(STEMS_DIR, fs.constants.W_OK);
      console.log('Upload directory is writable');
      
      const stats = await fs.stat(STEMS_DIR);
      console.log('Directory permissions:', {
        path: STEMS_DIR,
        mode: stats.mode.toString(8),
        uid: stats.uid,
        gid: stats.gid,
        freeSpace: fs.statfsSync(STEMS_DIR).bfree * fs.statfsSync(STEMS_DIR).bsize
      });
      
      cb(null, STEMS_DIR);
    } catch (error) {
      console.error('Error with upload directory:', {
        error: error.message,
        stack: error.stack,
        uploadDir: STEMS_DIR
      });
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    console.log('Multer filename handler:', {
      file: {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype
      }
    });

    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter:', {
      file: {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype
      },
      headers: req.headers
    });

    // Accept any audio file type for now
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`));
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 100, // 100MB limit per file
    files: 8 // Maximum 8 stems
  }
}).array('stems', 8);

exports.createProject = async (req, res) => {
  try {
    console.log('Project creation request received:', {
      body: req.body,
      files: req.files ? req.files.length : 0,
      userId: req.userId,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[exists]' : '[missing]',
        'content-type': req.headers['content-type']
      },
      method: req.method,
      path: req.path,
      mongoState: mongoose.connection.readyState,
      uploadDir: STEMS_DIR,
      tempDir: {
        path: '/tmp',
        exists: fs.existsSync('/tmp'),
        writable: fs.existsSync('/tmp') ? Boolean(fs.statSync('/tmp').mode & fs.constants.W_OK) : false,
        freeSpace: fs.existsSync('/tmp') ? fs.statfsSync('/tmp').bfree * fs.statfsSync('/tmp').bsize : 0
      }
    });

    // Verify upload directory exists and is writable
    try {
      await fs.mkdir(STEMS_DIR, { recursive: true, mode: 0o777 });
      await fs.access(STEMS_DIR, fs.constants.W_OK);
      const stats = await fs.stat(STEMS_DIR);
      console.log('Upload directory verified:', {
        path: STEMS_DIR,
        mode: stats.mode.toString(8),
        uid: stats.uid,
        gid: stats.gid,
        isDirectory: stats.isDirectory(),
        isWritable: Boolean(stats.mode & fs.constants.W_OK)
      });
    } catch (dirError) {
      console.error('Upload directory error:', {
        error: dirError.message,
        code: dirError.code,
        stack: dirError.stack,
        path: STEMS_DIR
      });
      return res.status(500).json({ 
        message: 'Server configuration error - upload directory not accessible',
        error: dirError.message
      });
    }

    // Handle file upload with detailed logging
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) {
          console.error('Upload error:', {
            message: err.message,
            code: err.code,
            name: err.name,
            stack: err.stack,
            mongoState: mongoose.connection.readyState,
            multerError: err instanceof multer.MulterError,
            headers: req.headers,
            tempDir: {
              path: '/tmp',
              exists: fs.existsSync('/tmp'),
              writable: fs.existsSync('/tmp') ? Boolean(fs.statSync('/tmp').mode & fs.constants.W_OK) : false,
              freeSpace: fs.existsSync('/tmp') ? fs.statfsSync('/tmp').bfree * fs.statfsSync('/tmp').bsize : 0
            }
          });
          reject(err);
        } else {
          console.log('Upload successful:', {
            filesReceived: req.files ? req.files.length : 0,
            files: req.files ? req.files.map(f => ({
              originalname: f.originalname,
              path: f.path,
              size: f.size,
              exists: fs.existsSync(f.path),
              stats: fs.existsSync(f.path) ? fs.statSync(f.path) : null,
              permissions: fs.existsSync(f.path) ? (fs.statSync(f.path).mode & parseInt('777', 8)).toString(8) : null
            })) : [],
            body: req.body,
            uploadDir: STEMS_DIR
          });
          resolve();
        }
      });
    });

    if (!req.files || req.files.length === 0) {
      console.error('No files received in request');
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Process files
    const processedDir = path.join(__dirname, '../uploads/processed');
    console.log('Processing files in directory:', processedDir);
    
    // Ensure processed directory exists
    await fs.mkdir(processedDir, { recursive: true });
    
    const processedFiles = await audioProcessor.processAudioFiles(req.files, processedDir);
    console.log('Files processed:', {
      count: processedFiles.length,
      files: processedFiles.map(f => ({
        originalPath: f.originalPath,
        processedPath: f.processedPath,
        exists: {
          original: fsSync.existsSync(f.originalPath),
          processed: fsSync.existsSync(f.processedPath)
        },
        stats: {
          original: fsSync.existsSync(f.originalPath) ? fsSync.statSync(f.originalPath) : null,
          processed: fsSync.existsSync(f.processedPath) ? fsSync.statSync(f.processedPath) : null
        }
      }))
    });

    // Create project files array with proper structure
    const files = processedFiles.map(file => ({
      originalPath: file.originalPath,
      processedPath: file.processedPath,
      type: 'wav',
      size: fsSync.statSync(file.originalPath).size,
      stemType: 'other'
    }));

    // Create project with properly structured data
    const projectData = {
      name: req.body.name || 'Untitled Project',
      mixStyle: req.body.mixStyle || 'pop',
      user: req.userId,
      files: files,
      status: 'uploading'
    };

    console.log('Creating project with data:', {
      ...projectData,
      files: projectData.files.map(f => ({
        ...f,
        exists: {
          original: fsSync.existsSync(f.originalPath),
          processed: fsSync.existsSync(f.processedPath)
        }
      }))
    });

    const project = new Project(projectData);
    console.log('Project model created:', {
      id: project._id,
      name: project.name,
      filesCount: project.files.length,
      mongoState: mongoose.connection.readyState
    });

    const savedProject = await project.save();
    console.log('Project saved successfully:', {
      id: savedProject._id,
      name: savedProject.name,
      filesCount: savedProject.files.length,
      mongoState: mongoose.connection.readyState,
      files: savedProject.files.map(f => ({
        originalPath: f.originalPath,
        processedPath: f.processedPath,
        exists: {
          original: fsSync.existsSync(f.originalPath),
          processed: fsSync.existsSync(f.processedPath)
        }
      }))
    });

    res.status(201).json(savedProject);

  } catch (error) {
    console.error('Project creation error:', {
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        multerError: error instanceof multer.MulterError
      },
      request: {
        method: req.method,
        path: req.path,
        headers: {
          ...req.headers,
          authorization: req.headers.authorization ? '[exists]' : '[missing]'
        },
        body: req.body,
        files: req.files ? req.files.map(f => ({
          originalname: f.originalname,
          path: f.path,
          exists: fs.existsSync(f.path),
          stats: fs.existsSync(f.path) ? fs.statSync(f.path) : null
        })) : []
      },
      system: {
        mongoState: mongoose.connection.readyState,
        tempDir: {
          path: '/tmp',
          exists: fs.existsSync('/tmp'),
          writable: fs.existsSync('/tmp') ? Boolean(fs.statSync('/tmp').mode & fs.constants.W_OK) : false,
          freeSpace: fs.existsSync('/tmp') ? fs.statfsSync('/tmp').bfree * fs.statfsSync('/tmp').bsize : 0
        },
        uploadDir: {
          path: STEMS_DIR,
          exists: fs.existsSync(STEMS_DIR),
          writable: fs.existsSync(STEMS_DIR) ? Boolean(fs.statSync(STEMS_DIR).mode & fs.constants.W_OK) : false
        }
      }
    });
    
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        message: 'File upload error',
        error: error.message,
        code: error.code
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating project',
      error: error.message,
      mongoState: mongoose.connection.readyState
    });
  }
};

exports.analyzeProject = async (projectId) => {
  console.log('Analyzing project:', projectId);
  const project = await Project.findById(projectId);
  
  try {
    // Analyze the audio file
    console.log('Starting audio analysis for file:', project.sourceFile.path);
    const audioTracks = await AudioAnalysisService.analyzeContainer(project.sourceFile.path);
    
    console.log('Audio analysis complete:', audioTracks);
    // Update project with extracted tracks
    project.audioFiles = audioTracks;
    project.status = 'completed';

    // Initialize mix settings for each track
    project.mixSettings = {
      masterVolume: 0,
      tracks: audioTracks.map(track => ({
        audioFileId: track._id,
        volume: 0,
        mute: false
      }))
    };

    console.log('Saving analyzed project...');
    await project.save();
    console.log('Analysis complete and saved');
  } catch (error) {
    console.error('Analysis error:', error);
    project.status = 'error';
    project.error = {
      message: 'Failed to analyze audio files',
      details: error.message
    };
    await project.save();
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ user: req.userId })
      .select('-audioFiles.peaks')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    console.log('Getting project:', req.params.id);
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!project) {
      console.log('Project not found');
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('Sending project data:', project);
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Error fetching project', error: error.message });
  }
};

exports.updateMixSettings = async (req, res) => {
  try {
    const { mixSettings } = req.body;
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.mixSettings = mixSettings;
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error updating mix settings', error: error.message });
  }
};

exports.renderMix = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('stems');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.status = 'processing';
    await project.save();

    // Render the mix
    const outputPath = await AudioProcessor.renderMix(project);

    // Update project with rendered file info
    project.status = 'ready';
    project.renderedFile = {
      path: outputPath,
      fileName: path.basename(outputPath),
      createdAt: new Date()
    };
    await project.save();

    // Send download URL
    res.json({
      message: 'Mix rendered successfully',
      downloadUrl: `/api/projects/${project._id}/download`
    });
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).json({ 
      message: 'Error rendering mix', 
      error: error.message 
    });
  }
};

exports.downloadMix = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!project || !project.mixedFile) {
      return res.status(404).json({ message: 'Mix file not found' });
    }

    const mixPath = project.mixedFile.path;
    console.log('Downloading mix:', {
      projectId: project._id,
      mixPath,
      mixedFile: project.mixedFile
    });

    if (!fsSync.existsSync(mixPath)) {
      console.error('Mix file not found on disk:', mixPath);
      return res.status(404).json({ message: 'Mix file not found on disk' });
    }

    res.download(mixPath, project.mixedFile.fileName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading mix', error: error.message });
  }
};

async function analyzeProject(projectId) {
  const project = await Project.findById(projectId);
  if (!project) return;

  try {
    project.status = 'analyzing';
    await project.save();

    // Analyze each stem
    for (const stem of project.stems) {
      try {
        // Basic file validation
        await fs.access(stem.path);
        
        // Here you would call your audio analysis service
        // For now, we'll just set some dummy values
        stem.analysis = {
          peakLevel: -3,
          rmsLevel: -18,
          clipCount: 0,
          lowFreqIssues: {
            detected: false,
            frequency: 0,
            severity: 0
          },
          highFreqIssues: {
            detected: false,
            frequency: 0,
            severity: 0
          },
          noiseProfile: {
            detected: false,
            frequency: 0,
            severity: 0
          }
        };

        // Apply processing based on mixStyle
        const styleProcessing = Project.mixStyles[project.mixStyle].processing;
        stem.processing = {
          gainAdjust: 0,
          eqAdjustments: [],
          noiseReduction: {
            enabled: false,
            amount: 0
          }
        };
      } catch (error) {
        console.error(`Error analyzing stem ${stem.fileName}:`, error);
      }
    }

    project.status = 'ready';
    await project.save();
  } catch (error) {
    console.error('Analysis error:', error);
    project.status = 'error';
    project.error = {
      message: 'Failed to analyze audio files',
      details: error.message
    };
    await project.save();
  }
} 

exports.mixProject = async (req, res) => {
  try {
    // Find the project
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.files || project.files.length === 0) {
      return res.status(400).json({ message: 'No files to mix' });
    }

    // Create mix filename and paths
    const mixFileName = `mix_${project._id}_${Date.now()}.wav`;
    const mixDir = path.join(__dirname, '../uploads/mixed');
    const mixPath = path.join(mixDir, mixFileName);

    // Ensure mixed directory exists
    await fs.mkdir(mixDir, { recursive: true });

    // Log what we're about to do
    console.log('Starting mix:', {
      projectId: project._id,
      mixFileName,
      mixPath,
      fileCount: project.files.length,
      files: project.files.map(f => ({
        path: f.processedPath,
        exists: fsSync.existsSync(f.processedPath)
      }))
    });

    // Create the mix
    await audioProcessor.mixAudioFiles(project.files, mixPath);

    // Update the project with the mix file info
    project.mixedFile = {
      fileName: mixFileName,
      path: mixPath,
      createdAt: new Date()
    };

    await project.save();

    // Log success
    console.log('Mix completed successfully:', {
      projectId: project._id,
      mixPath,
      exists: fsSync.existsSync(mixPath)
    });

    // Send response
    res.json({
      message: 'Mix created successfully',
      mixedFile: project.mixedFile
    });

  } catch (error) {
    // Log the full error
    console.error('Mix error:', {
      message: error.message,
      stack: error.stack
    });

    // Send error response
    res.status(500).json({
      message: 'Error creating mix',
      error: error.message
    });
  }
}; 

exports.serveMixedFile = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../uploads/mixed', req.params.filename);
    console.log('Serving mixed file:', filePath);

    if (!fsSync.existsSync(filePath)) {
      console.error('Mixed file not found:', filePath);
      return res.status(404).json({ message: 'Mixed file not found' });
    }

    // Use absolute path with res.sendFile
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error serving mixed file:', error);
    res.status(500).json({ message: 'Error serving mixed file', error: error.message });
  }
};

exports.serveProcessedFile = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../uploads/processed', req.params.filename);
    console.log('Serving processed file:', filePath);

    if (!fsSync.existsSync(filePath)) {
      console.error('Processed file not found:', filePath);
      return res.status(404).json({ message: 'Processed file not found' });
    }

    // Use absolute path with res.sendFile
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error serving processed file:', error);
    res.status(500).json({ message: 'Error serving processed file', error: error.message });
  }
}; 

exports.downloadMixByFilename = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../uploads/mixed', req.params.filename);
    console.log('Downloading mix by filename:', {
      filename: req.params.filename,
      filePath
    });

    if (!fsSync.existsSync(filePath)) {
      console.error('Mix file not found on disk:', filePath);
      return res.status(404).json({ message: 'Mix file not found on disk' });
    }

    res.download(filePath, req.params.filename);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading mix', error: error.message });
  }
}; 

const handleMix = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '..', 'uploads', 'mixed');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate unique filename for the mixed file
    const mixedFileName = `mixed_${Date.now()}_${path.basename(project.files[0].processedPath)}`;
    const mixedFilePath = path.join(outputDir, mixedFileName);

    console.log('Starting mix process:', {
      projectId: id,
      outputPath: mixedFilePath,
      files: project.files
    });

    // Collect processing details
    const processingDetails = {
      files: await Promise.all(project.files.map(async file => {
        try {
          // Analyze the processed file
          const analysis = await audioProcessor.analyzeAudio(file.processedPath);
          
          // Get processing filters that were applied
          const processing = {
            filters: []
          };

          // Add filters based on analysis
          if (analysis.issues.muddy) {
            processing.filters.push({ filter: 'equalizer', description: 'Low-mid cleanup' });
          }
          if (analysis.issues.harsh) {
            processing.filters.push({ filter: 'equalizer', description: 'High frequency smoothing' });
          }
          if (analysis.dynamics.crestFactor > 25) {
            processing.filters.push({ filter: 'compand', description: 'Dynamic range control' });
          }
          if (analysis.issues.phaseCancellation) {
            processing.filters.push({ filter: 'aphaser', description: 'Phase correction' });
          }
          if (analysis.issues.excessiveStereoWidth) {
            processing.filters.push({ filter: 'stereotools', description: 'Stereo field adjustment' });
          }

          return {
            name: path.basename(file.originalPath),
            stemType: file.stemType,
            analysis,
            processing
          };
        } catch (err) {
          console.error('Error analyzing file:', err);
          return {
            name: path.basename(file.originalPath),
            stemType: file.stemType,
            error: 'Analysis failed'
          };
        }
      })),
      mixingDetails: {
        method: 'Complex Filter Graph',
        format: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        channels: 2
      }
    };

    // Mix the files
    await audioProcessor.mixAudioFiles(project.files, mixedFilePath);

    // Update project with mixed file info
    project.mixedFile = {
      fileName: mixedFileName,
      path: mixedFilePath
    };
    await project.save();

    res.json({ 
      message: 'Mix created successfully',
      processingDetails
    });
  } catch (err) {
    console.error('Mix error:', err);
    res.status(500).json({ message: err.message });
  }
}; 