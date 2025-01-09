require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const auth = require("./middleware/auth");

// Import models
require("./models/User");

// Define upload directories first
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? path.join(process.env.HOME || "/tmp", "audioalchemy")
    : path.join(__dirname, "uploads");
const STEMS_DIR = path.join(UPLOAD_DIR, "stems");
const PROCESSED_DIR = path.join(UPLOAD_DIR, "processed");
const MIXED_DIR = path.join(UPLOAD_DIR, "mixed");

// Create required directories with proper permissions
const ensureDirectoriesExist = async () => {
  const directories = [UPLOAD_DIR, STEMS_DIR, PROCESSED_DIR, MIXED_DIR];

  for (const dir of directories) {
    try {
      await fs.promises.mkdir(dir, { recursive: true, mode: 0o777 });
      await fs.promises.chmod(dir, 0o777);

      // Verify the directory is writable
      const testFile = path.join(dir, ".write-test");
      await fs.promises.writeFile(testFile, "test");
      await fs.promises.unlink(testFile);

      console.log(`Directory verified and writable: ${dir}`);
    } catch (error) {
      console.error(`Error with directory ${dir}:`, {
        error: error.message,
        code: error.code,
        path: dir,
      });

      // Try alternative directory if in production
      if (process.env.NODE_ENV === "production" && error.code === "EACCES") {
        const altDir = path.join("/tmp", "audioalchemy", path.basename(dir));
        try {
          await fs.promises.mkdir(altDir, { recursive: true, mode: 0o777 });
          await fs.promises.chmod(altDir, 0o777);
          console.log(`Using alternative directory: ${altDir}`);

          // Update the corresponding directory constant
          if (dir === UPLOAD_DIR) global.UPLOAD_DIR = altDir;
          else if (dir === STEMS_DIR) global.STEMS_DIR = altDir;
          else if (dir === PROCESSED_DIR) global.PROCESSED_DIR = altDir;
          else if (dir === MIXED_DIR) global.MIXED_DIR = altDir;
        } catch (altError) {
          console.error(
            `Error with alternative directory ${altDir}:`,
            altError
          );
        }
      }
    }
  }
};

// Ensure directories exist before starting the server
ensureDirectoriesExist().catch(console.error);

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://audio-alchemy-tau.vercel.app",
      "http://localhost:5173",
      "http://localhost:7000",
      "http://localhost:3000",
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV === "development"
    ) {
      callback(null, true);
    } else {
      console.log("Origin not allowed:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: [
    "Content-Range",
    "X-Content-Range",
    "Accept-Ranges",
    "Content-Length",
  ],
  maxAge: 86400,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/templates", require("./routes/templates"));

// Serve static files
const serveStatic = (directory, route) => {
  app.use(
    route,
    express.static(directory, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".wav") || filePath.endsWith(".mp3")) {
          res.set({
            "Accept-Ranges": "bytes",
            "Content-Type": filePath.endsWith(".wav")
              ? "audio/wav"
              : "audio/mpeg",
            "Cache-Control": "no-cache",
            "Content-Disposition": "inline",
          });
        }
      },
    })
  );
};

// Serve upload directories
app.use("/api/projects/processed", express.static(PROCESSED_DIR));
app.use("/api/projects/mixed", express.static(MIXED_DIR));
app.use("/api/projects/stems", express.static(STEMS_DIR));

// Root path handler
app.get("/", (req, res) => {
  res.status(200).json({
    message: "AudioAlchemy API is running",
    status: "healthy",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Database connection
const mongooseOptions = {
  dbName: "itMix",
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Initialize server
const initializeServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log("Connected to MongoDB");

    const startServer = (port) => {
      const server = app
        .listen(port)
        .on("error", (err) => {
          if (err.code === "EADDRINUSE") {
            console.log(`Port ${port} is busy, trying ${port + 1}`);
            server.close();
            startServer(port + 1);
          } else {
            console.error("Server error:", err);
            process.exit(1);
          }
        })
        .on("listening", () => {
          console.log(`Server running on port ${port}`);
        });
    };

    const PORT = parseInt(process.env.PORT || "7000");
    startServer(PORT);
  } catch (error) {
    console.error("Server initialization failed:", error);
    process.exit(1);
  }
};

// Start the server
initializeServer();
