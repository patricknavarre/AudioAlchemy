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
    ? path.join(process.env.HOME || "/tmp", "audioalchemy")
    : path.join(__dirname, "../uploads");
const PROCESSED_DIR = path.join(UPLOAD_DIR, "processed");
const MIXED_DIR = path.join(UPLOAD_DIR, "mixed");

// Debug middleware for all project routes
router.use((req, res, next) => {
  console.log("Project route details:", {
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params,
    body: req.method === "POST" ? req.body : undefined,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? "[exists]" : "[missing]",
      origin: req.headers.origin || "no origin",
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
    },
    files: req.files ? req.files.length : 0,
  });

  // Ensure CORS headers are set for all responses
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://audio-alchemy-tau.vercel.app",
    "https://audioalchemy-gszy.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Expose-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

// Project routes
router.post("/", auth, projectController.createProject);
router.get("/", auth, projectController.getProjects);
router.get("/:id", auth, projectController.getProject);
router.put("/:id/mix-settings", auth, projectController.updateMixSettings);
router.post("/:id/mix", auth, projectController.mixProject);
router.get("/:id/download", auth, projectController.downloadMix);

// File serving routes with proper headers
const serveFile = (filePath, res) => {
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    res.set({
      "Content-Type":
        path.extname(filePath) === ".wav" ? "audio/wav" : "audio/mpeg",
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
      "Content-Disposition": "inline",
    });
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ message: "File not found" });
  }
};

router.get("/processed/:filename", auth, (req, res) => {
  const filePath = path.join(PROCESSED_DIR, req.params.filename);
  console.log("Serving processed file:", {
    requestedPath: filePath,
    exists: fs.existsSync(filePath),
  });
  serveFile(filePath, res);
});

router.get("/mixed/:filename", auth, (req, res) => {
  const filePath = path.join(MIXED_DIR, req.params.filename);
  console.log("Serving mixed file:", {
    requestedPath: filePath,
    exists: fs.existsSync(filePath),
  });
  serveFile(filePath, res);
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

  // Ensure CORS headers are set for errors
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://audio-alchemy-tau.vercel.app",
    "https://audioalchemy-gszy.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

module.exports = router;
