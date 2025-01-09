const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const projectController = require("../controllers/projectController");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Import the UPLOAD_DIR and other constants
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/var/data/audioalchemy")
    : path.join(__dirname, "../uploads");
const PROCESSED_DIR = path.join(UPLOAD_DIR, "processed");
const MIXED_DIR = path.join(UPLOAD_DIR, "mixed");
const STEMS_DIR = path.join(UPLOAD_DIR, "stems");

// Ensure all directories exist at startup
const initDirectories = async () => {
  try {
    for (const dir of [UPLOAD_DIR, PROCESSED_DIR, MIXED_DIR, STEMS_DIR]) {
      await fs.mkdir(dir, { recursive: true, mode: 0o777 });
      console.log(`Directory created/verified: ${dir}`);

      // Test write permissions
      const testFile = path.join(dir, ".write-test");
      await fs.writeFile(testFile, "test");
      await fs.unlink(testFile);
      console.log(`Write permissions verified for: ${dir}`);
    }
  } catch (error) {
    console.error("Error initializing directories:", error);
    throw error;
  }
};

// Initialize directories when the server starts
initDirectories().catch(console.error);

// Debug middleware for project routes
router.use((req, res, next) => {
  console.log("Project route request:", {
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params,
    body:
      req.method === "POST"
        ? {
            name: req.body?.name,
            mixStyle: req.body?.mixStyle,
            hasFiles: !!req.files,
            fileCount: req.files?.length,
          }
        : undefined,
    headers: {
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
      authorization: req.headers.authorization ? "[exists]" : "[missing]",
      origin: req.headers.origin,
    },
  });
  next();
});

// Project routes with better error handling
router.post("/", auth, async (req, res) => {
  try {
    console.log("Creating project:", {
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? "[exists]" : "[missing]",
        "content-type": req.headers["content-type"],
        "content-length": req.headers["content-length"],
      },
      userId: req.userId,
      body: {
        name: req.body?.name,
        mixStyle: req.body?.mixStyle,
      },
    });

    // Ensure upload directories exist
    await Promise.all([
      fs.mkdir(UPLOAD_DIR, { recursive: true }),
      fs.mkdir(PROCESSED_DIR, { recursive: true }),
      fs.mkdir(MIXED_DIR, { recursive: true }),
    ]);

    // Create project
    await projectController.createProject(req, res);
  } catch (error) {
    console.error("Project creation error:", {
      message: error.message,
      stack: error.stack,
      userId: req.userId,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? "[exists]" : "[missing]",
      },
    });

    // Send appropriate error response
    const statusCode = error.name === "MulterError" ? 400 : 500;
    res.status(statusCode).json({
      message: "Error creating project",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    await projectController.getProjects(req, res);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({
      message: "Error fetching projects",
      error: error.message,
    });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    await projectController.getProject(req, res);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({
      message: "Error fetching project",
      error: error.message,
    });
  }
});

router.put("/:id/mix-settings", auth, async (req, res) => {
  try {
    await projectController.updateMixSettings(req, res);
  } catch (error) {
    console.error("Error updating mix settings:", error);
    res.status(500).json({
      message: "Error updating mix settings",
      error: error.message,
    });
  }
});

router.post("/:id/mix", auth, async (req, res) => {
  try {
    await projectController.mixProject(req, res);
  } catch (error) {
    console.error("Error mixing project:", error);
    res.status(500).json({
      message: "Error mixing project",
      error: error.message,
    });
  }
});

// File serving routes with better error handling
const serveFile = async (filePath, res) => {
  try {
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      console.error("File not found:", filePath);
      return res.status(404).json({ message: "File not found" });
    }

    const stats = await fs.stat(filePath);
    res.set({
      "Content-Type":
        path.extname(filePath) === ".wav" ? "audio/wav" : "audio/mpeg",
      "Content-Length": stats.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
      "Content-Disposition": "inline",
    });

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error("Error serving file:", {
      path: filePath,
      error: error.message,
    });
    res.status(500).json({
      message: "Error serving file",
      error: error.message,
    });
  }
};

router.get("/processed/:filename", auth, async (req, res) => {
  const filePath = path.join(PROCESSED_DIR, req.params.filename);
  console.log("Serving processed file:", {
    requestedPath: filePath,
  });
  await serveFile(filePath, res);
});

router.get("/mixed/:filename", auth, async (req, res) => {
  const filePath = path.join(MIXED_DIR, req.params.filename);
  console.log("Serving mixed file:", {
    requestedPath: filePath,
  });
  await serveFile(filePath, res);
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error("Project route error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.method === "POST" ? req.body : undefined,
    files: req.files,
  });

  // Ensure CORS headers are set for errors
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://audio-alchemy-tau.vercel.app",
    "http://localhost:5173",
    "http://localhost:7000",
  ];

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.status(err.status || 500).json({
    message: err.message || "Project operation failed",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

module.exports = router;
