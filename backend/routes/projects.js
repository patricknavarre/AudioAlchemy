const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const projectController = require("../controllers/projectController");
const Project = require("../models/Project");
const path = require("path");
const fs = require("fs");

// Import the UPLOAD_DIR and other constants
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? "/tmp/audioalchemy"
    : path.join(__dirname, "../uploads");
const PROCESSED_DIR = path.join(UPLOAD_DIR, "processed");
const MIXED_DIR = path.join(UPLOAD_DIR, "mixed");

// Debug middleware for all project routes
router.use((req, res, next) => {
  console.log("Project Route Request:", {
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params,
    body: req.method === "POST" ? req.body : undefined,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? "[exists]" : "[missing]",
    },
    files: req.files ? req.files.length : 0,
  });
  next();
});

// Project routes
router.post("/", auth, projectController.createProject);
router.get("/", auth, projectController.getProjects);
router.get("/:id", auth, projectController.getProject);
router.put("/:id/mix-settings", auth, projectController.updateMixSettings);
router.post("/:id/mix", auth, projectController.mixProject);
router.get("/:id/download", auth, projectController.downloadMix);

// File serving routes
router.get("/processed/:filename", auth, (req, res) => {
  const filePath = path.join(PROCESSED_DIR, req.params.filename);
  console.log("Serving processed file:", {
    requestedPath: filePath,
    exists: fs.existsSync(filePath),
    filename: req.params.filename,
    processedDir: PROCESSED_DIR,
  });

  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    console.error("Processed file not found:", {
      filePath,
      filename: req.params.filename,
      processedDir: PROCESSED_DIR,
      exists: fs.existsSync(PROCESSED_DIR),
    });
    res.status(404).json({ message: "File not found" });
  }
});

router.get("/mixed/:filename", auth, (req, res) => {
  const filePath = path.join(MIXED_DIR, req.params.filename);
  console.log("Serving mixed file:", {
    requestedPath: filePath,
    exists: fs.existsSync(filePath),
    filename: req.params.filename,
    mixedDir: MIXED_DIR,
  });

  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    console.error("Mixed file not found:", {
      filePath,
      filename: req.params.filename,
      mixedDir: MIXED_DIR,
      exists: fs.existsSync(MIXED_DIR),
    });
    res.status(404).json({ message: "File not found" });
  }
});

// Download routes
router.get("/download/mixed/:filename", auth, (req, res) => {
  const filePath = path.join(MIXED_DIR, req.params.filename);
  console.log("Downloading mixed file:", {
    requestedPath: filePath,
    exists: fs.existsSync(filePath),
    filename: req.params.filename,
    mixedDir: MIXED_DIR,
  });

  if (fs.existsSync(filePath)) {
    res.download(filePath, req.params.filename);
  } else {
    console.error("Mix file not found:", {
      filePath,
      filename: req.params.filename,
      mixedDir: MIXED_DIR,
      exists: fs.existsSync(MIXED_DIR),
    });
    res.status(404).json({ message: "Mix file not found" });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error("Project route error:", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers,
  });
  res.status(500).json({ message: err.message });
});

module.exports = router;
