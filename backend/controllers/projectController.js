const Project = require("../models/Project");
const { spawn } = require("child_process");
const path = require("path");
const multer = require("multer");
const fs = require("fs").promises;
const fsSync = require("fs");
const audioProcessor = require("../services/audioProcessor");
const mongoose = require("mongoose");
const os = require("os");

// Define upload directories consistently with routes
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/var/data/audioalchemy")
    : path.join(__dirname, "../uploads");
const STEMS_DIR = path.join(UPLOAD_DIR, "stems");
const PROCESSED_DIR = path.join(UPLOAD_DIR, "processed");
const MIXED_DIR = path.join(UPLOAD_DIR, "mixed");

// Helper function to convert absolute path to relative path
const toRelativePath = (absolutePath) => {
  const relativePath = path.relative(UPLOAD_DIR, absolutePath);
  // Replace backslashes with forward slashes for URL compatibility
  return relativePath.replace(/\\/g, "/");
};

// Helper function to convert relative path to absolute path
const toAbsolutePath = (relativePath) => {
  // Ensure forward slashes for path joining
  const normalizedPath = relativePath.replace(/\\/g, "/");
  return path.join(UPLOAD_DIR, normalizedPath);
};

// Helper function to get the URL path for a file
const getUrlPath = (filePath) => {
  const relativePath = toRelativePath(filePath);
  const pathParts = relativePath.split(path.sep);
  const fileType = pathParts[0]; // 'processed', 'mixed', or 'stems'
  const fileName = pathParts[pathParts.length - 1];
  return `/api/projects/${fileType}/${fileName}`;
};

// Ensure required directories exist with proper permissions
const ensureDirectories = async () => {
  const dirs = [UPLOAD_DIR, STEMS_DIR, PROCESSED_DIR, MIXED_DIR];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true, mode: 0o777 });
      console.log("Directory created/verified:", dir);

      // Verify directory permissions
      await fs.access(dir, fs.constants.W_OK);
      console.log("Directory is writable:", dir);

      // Create a test file to verify write permissions
      const testFile = path.join(dir, ".write-test");
      await fs.writeFile(testFile, "test");
      await fs.unlink(testFile);
      console.log("Write test successful:", dir);

      const stats = await fs.stat(dir);
      console.log("Directory permissions:", {
        path: dir,
        mode: stats.mode.toString(8),
        uid: stats.uid,
        gid: stats.gid,
      });
    } catch (error) {
      console.error("Error creating/verifying directory:", {
        dir,
        error: error.message,
        stack: error.stack,
      });
      throw error; // Throw error to prevent uploads if directories aren't writable
    }
  }
};

// Call ensureDirectories at startup
ensureDirectories().catch(console.error);

// Configure multer for stem uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Ensure the stems directory exists and is writable
      await fs.mkdir(STEMS_DIR, { recursive: true, mode: 0o777 });

      // Test write access
      const testFile = path.join(STEMS_DIR, ".write-test");
      await fs.writeFile(testFile, "test");
      await fs.unlink(testFile);

      console.log("Upload directory verified:", {
        dir: STEMS_DIR,
        file: file.originalname,
      });

      cb(null, STEMS_DIR);
    } catch (error) {
      console.error("Upload directory error:", {
        dir: STEMS_DIR,
        error: error.message,
        stack: error.stack,
      });
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only audio files are allowed.`
        )
      );
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 100, // 100MB limit
    files: 8, // Maximum 8 files
  },
}).array("stems", 8);

// Helper function to clean up files in case of error
const cleanupFiles = async (files) => {
  if (!files) return;

  for (const file of files) {
    try {
      if (file.path && fsSync.existsSync(file.path)) {
        await fs.unlink(file.path);
        console.log(`Cleaned up file: ${file.path}`);
      }
    } catch (error) {
      console.error(`Error cleaning up file ${file.path}:`, error);
    }
  }
};

exports.createProject = async (req, res) => {
  let uploadedFiles = [];
  try {
    console.log("Starting project creation:", {
      contentType: req.headers["content-type"],
      contentLength: req.headers["content-length"],
    });

    // Handle file upload
    await new Promise((resolve, reject) => {
      upload(req, res, async (err) => {
        if (err) {
          console.error("Upload error:", {
            message: err.message,
            code: err.code,
            name: err.name,
          });
          reject(err);
          return;
        }

        uploadedFiles = req.files || [];
        if (!uploadedFiles.length) {
          reject(new Error("No files received"));
          return;
        }

        // Verify uploaded files
        for (const file of uploadedFiles) {
          try {
            const stats = await fs.stat(file.path);
            if (stats.size === 0) {
              throw new Error("File is empty");
            }
            console.log("File verified:", {
              name: file.originalname,
              path: file.path,
              size: stats.size,
            });
          } catch (error) {
            reject(
              new Error(
                `File verification failed for ${file.originalname}: ${error.message}`
              )
            );
            return;
          }
        }

        resolve();
      });
    });

    // Process files
    const processedDir = global.PROCESSED_DIR || PROCESSED_DIR;
    await fs.mkdir(processedDir, { recursive: true, mode: 0o777 });

    const processedFiles = await audioProcessor.processAudioFiles(
      uploadedFiles,
      processedDir
    );

    // Create project
    const files = processedFiles.map((file) => ({
      originalPath: toRelativePath(file.originalPath),
      processedPath: toRelativePath(file.processedPath),
      type: path.extname(file.originalPath).slice(1).toLowerCase() || "wav",
      size: fsSync.statSync(file.originalPath).size,
      stemType: "other",
      url: getUrlPath(file.processedPath),
    }));

    const project = new Project({
      name: req.body.name || "Untitled Project",
      mixStyle: req.body.mixStyle || "pop",
      user: req.userId,
      files: files,
      status: "ready",
    });

    const savedProject = await project.save();
    console.log("Project saved:", {
      id: savedProject._id,
      files: savedProject.files.length,
    });

    res.status(201).json({
      ...savedProject.toObject(),
      files: savedProject.files.map((file) => ({
        ...file.toObject(),
        url: getUrlPath(toAbsolutePath(file.processedPath)),
      })),
    });
  } catch (error) {
    console.error("Project creation failed:", {
      error: error.message,
      stack: error.stack,
    });

    // Clean up files
    await cleanupFiles(uploadedFiles);

    // Send appropriate error response
    const statusCode = error instanceof multer.MulterError ? 400 : 500;
    res.status(statusCode).json({
      message: "Project creation failed",
      error: error.message,
    });
  }
};

exports.analyzeProject = async (projectId) => {
  console.log("Analyzing project:", projectId);
  const project = await Project.findById(projectId);

  try {
    // Analyze the audio file
    console.log("Starting audio analysis for file:", project.sourceFile.path);
    const audioTracks = await AudioAnalysisService.analyzeContainer(
      project.sourceFile.path
    );

    console.log("Audio analysis complete:", audioTracks);
    // Update project with extracted tracks
    project.audioFiles = audioTracks;
    project.status = "completed";

    // Initialize mix settings for each track
    project.mixSettings = {
      masterVolume: 0,
      tracks: audioTracks.map((track) => ({
        audioFileId: track._id,
        volume: 0,
        mute: false,
      })),
    };

    console.log("Saving analyzed project...");
    await project.save();
    console.log("Analysis complete and saved");
  } catch (error) {
    console.error("Analysis error:", error);
    project.status = "error";
    project.error = {
      message: "Failed to analyze audio files",
      details: error.message,
    };
    await project.save();
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ user: req.userId })
      .select("-audioFiles.peaks")
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching projects", error: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    console.log("Getting project:", req.params.id);
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!project) {
      console.log("Project not found");
      return res.status(404).json({ message: "Project not found" });
    }

    // Convert to object and add URLs
    const responseProject = project.toObject();
    responseProject.files = responseProject.files.map((file) => ({
      ...file,
      url: getUrlPath(toAbsolutePath(file.processedPath)),
    }));
    if (responseProject.mixedFile) {
      responseProject.mixedFile.url = getUrlPath(
        toAbsolutePath(responseProject.mixedFile.path)
      );
    }

    console.log("Sending project data:", responseProject);
    res.json(responseProject);
  } catch (error) {
    console.error("Error fetching project:", error);
    res
      .status(500)
      .json({ message: "Error fetching project", error: error.message });
  }
};

exports.updateMixSettings = async (req, res) => {
  try {
    const { mixSettings } = req.body;
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.mixSettings = mixSettings;
    await project.save();

    res.json(project);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating mix settings", error: error.message });
  }
};

exports.renderMix = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId,
    }).populate("stems");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.status = "processing";
    await project.save();

    // Render the mix
    const outputPath = await AudioProcessor.renderMix(project);

    // Update project with rendered file info
    project.status = "ready";
    project.renderedFile = {
      path: outputPath,
      fileName: path.basename(outputPath),
      createdAt: new Date(),
    };
    await project.save();

    // Send download URL
    res.json({
      message: "Mix rendered successfully",
      downloadUrl: `/api/projects/${project._id}/download`,
    });
  } catch (error) {
    console.error("Render error:", error);
    res.status(500).json({
      message: "Error rendering mix",
      error: error.message,
    });
  }
};

exports.downloadMix = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!project || !project.mixedFile) {
      return res.status(404).json({ message: "Mix file not found" });
    }

    const mixPath = project.mixedFile.path;
    console.log("Downloading mix:", {
      projectId: project._id,
      mixPath,
      mixedFile: project.mixedFile,
    });

    if (!fsSync.existsSync(mixPath)) {
      console.error("Mix file not found on disk:", mixPath);
      return res.status(404).json({ message: "Mix file not found on disk" });
    }

    res.download(mixPath, project.mixedFile.fileName);
  } catch (error) {
    console.error("Download error:", error);
    res
      .status(500)
      .json({ message: "Error downloading mix", error: error.message });
  }
};

async function analyzeProject(projectId) {
  const project = await Project.findById(projectId);
  if (!project) return;

  try {
    project.status = "analyzing";
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
            severity: 0,
          },
          highFreqIssues: {
            detected: false,
            frequency: 0,
            severity: 0,
          },
          noiseProfile: {
            detected: false,
            frequency: 0,
            severity: 0,
          },
        };

        // Apply processing based on mixStyle
        const styleProcessing = Project.mixStyles[project.mixStyle].processing;
        stem.processing = {
          gainAdjust: 0,
          eqAdjustments: [],
          noiseReduction: {
            enabled: false,
            amount: 0,
          },
        };
      } catch (error) {
        console.error(`Error analyzing stem ${stem.fileName}:`, error);
      }
    }

    project.status = "ready";
    await project.save();
  } catch (error) {
    console.error("Analysis error:", error);
    project.status = "error";
    project.error = {
      message: "Failed to analyze audio files",
      details: error.message,
    };
    await project.save();
  }
}

exports.mixProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!project.files || project.files.length === 0) {
      return res.status(400).json({ message: "No files to mix" });
    }

    // Create mix filename and paths
    const mixFileName = `mix_${project._id}_${Date.now()}.wav`;
    const mixPath = path.join(MIXED_DIR, mixFileName);

    // Ensure mixed directory exists
    await fs.mkdir(MIXED_DIR, { recursive: true, mode: 0o777 });

    // Convert relative paths to absolute for processing
    const filesWithAbsolutePaths = project.files.map((file) => ({
      ...file.toObject(),
      processedPath: toAbsolutePath(file.processedPath),
    }));

    // Log what we're about to do
    console.log("Starting mix:", {
      projectId: project._id,
      mixFileName,
      mixPath,
      fileCount: project.files.length,
      files: filesWithAbsolutePaths.map((f) => ({
        path: f.processedPath,
        exists: fsSync.existsSync(f.processedPath),
      })),
    });

    // Create the mix
    await audioProcessor.mixAudioFiles(filesWithAbsolutePaths, mixPath);

    // Store relative path in database
    project.mixedFile = {
      fileName: mixFileName,
      path: toRelativePath(mixPath),
      createdAt: new Date(),
    };

    await project.save();

    // Log success
    console.log("Mix completed successfully:", {
      projectId: project._id,
      mixPath,
      exists: fsSync.existsSync(mixPath),
    });

    // Send response with URL
    res.json({
      message: "Mix created successfully",
      mixedFile: {
        ...project.mixedFile.toObject(),
        path: toAbsolutePath(project.mixedFile.path),
        url: getUrlPath(toAbsolutePath(project.mixedFile.path)),
      },
    });
  } catch (error) {
    // Log the full error
    console.error("Mix error:", {
      message: error.message,
      stack: error.stack,
    });

    // Send error response
    res.status(500).json({
      message: "Error creating mix",
      error: error.message,
    });
  }
};

exports.serveMixedFile = async (req, res) => {
  try {
    const filePath = path.join(MIXED_DIR, req.params.filename);
    console.log("Serving mixed file:", filePath);

    if (!fsSync.existsSync(filePath)) {
      console.error("Mixed file not found:", filePath);
      return res.status(404).json({ message: "Mixed file not found" });
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error("Error serving mixed file:", error);
    res
      .status(500)
      .json({ message: "Error serving mixed file", error: error.message });
  }
};

exports.serveProcessedFile = async (req, res) => {
  try {
    const filePath = path.join(PROCESSED_DIR, req.params.filename);
    console.log("Serving processed file:", filePath);

    if (!fsSync.existsSync(filePath)) {
      console.error("Processed file not found:", filePath);
      return res.status(404).json({ message: "Processed file not found" });
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error("Error serving processed file:", error);
    res
      .status(500)
      .json({ message: "Error serving processed file", error: error.message });
  }
};

exports.downloadMixByFilename = async (req, res) => {
  try {
    const filePath = path.join(MIXED_DIR, req.params.filename);
    console.log("Downloading mix by filename:", {
      filename: req.params.filename,
      filePath,
    });

    if (!fsSync.existsSync(filePath)) {
      console.error("Mix file not found on disk:", filePath);
      return res.status(404).json({ message: "Mix file not found on disk" });
    }

    res.download(filePath, req.params.filename);
  } catch (error) {
    console.error("Download error:", error);
    res
      .status(500)
      .json({ message: "Error downloading mix", error: error.message });
  }
};

const handleMix = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, "..", "uploads", "mixed");
    await fs.mkdir(outputDir, { recursive: true });

    // Generate unique filename for the mixed file
    const mixedFileName = `mixed_${Date.now()}_${path.basename(
      project.files[0].processedPath
    )}`;
    const mixedFilePath = path.join(outputDir, mixedFileName);

    console.log("Starting mix process:", {
      projectId: id,
      outputPath: mixedFilePath,
      files: project.files,
    });

    // Collect processing details
    const processingDetails = {
      files: await Promise.all(
        project.files.map(async (file) => {
          try {
            // Analyze the processed file
            const analysis = await audioProcessor.analyzeAudio(
              file.processedPath
            );

            // Get processing filters that were applied
            const processing = {
              filters: [],
            };

            // Add filters based on analysis
            if (analysis.issues.muddy) {
              processing.filters.push({
                filter: "equalizer",
                description: "Low-mid cleanup",
              });
            }
            if (analysis.issues.harsh) {
              processing.filters.push({
                filter: "equalizer",
                description: "High frequency smoothing",
              });
            }
            if (analysis.dynamics.crestFactor > 25) {
              processing.filters.push({
                filter: "compand",
                description: "Dynamic range control",
              });
            }
            if (analysis.issues.phaseCancellation) {
              processing.filters.push({
                filter: "aphaser",
                description: "Phase correction",
              });
            }
            if (analysis.issues.excessiveStereoWidth) {
              processing.filters.push({
                filter: "stereotools",
                description: "Stereo field adjustment",
              });
            }

            return {
              name: path.basename(file.originalPath),
              stemType: file.stemType,
              analysis,
              processing,
            };
          } catch (err) {
            console.error("Error analyzing file:", err);
            return {
              name: path.basename(file.originalPath),
              stemType: file.stemType,
              error: "Analysis failed",
            };
          }
        })
      ),
      mixingDetails: {
        method: "Complex Filter Graph",
        format: "WAV",
        sampleRate: 48000,
        bitDepth: 24,
        channels: 2,
      },
    };

    // Mix the files
    await audioProcessor.mixAudioFiles(project.files, mixedFilePath);

    // Update project with mixed file info
    project.mixedFile = {
      fileName: mixedFileName,
      path: mixedFilePath,
    };
    await project.save();

    res.json({
      message: "Mix created successfully",
      processingDetails,
    });
  } catch (err) {
    console.error("Mix error:", err);
    res.status(500).json({ message: err.message });
  }
};
