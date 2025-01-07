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
    ? "/tmp/audioalchemy"
    : path.join(__dirname, "uploads");
const STEMS_DIR = path.join(UPLOAD_DIR, "stems");
const PROCESSED_DIR = path.join(UPLOAD_DIR, "processed");
const MIXED_DIR = path.join(UPLOAD_DIR, "mixed");

// Create required directories with proper permissions
[UPLOAD_DIR, STEMS_DIR, PROCESSED_DIR, MIXED_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
    console.log(`Created directory: ${dir}`);
  }
  // Ensure proper permissions
  fs.chmodSync(dir, 0o777);
  console.log(`Set permissions for directory: ${dir}`);
});

const app = express();

// Basic CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log("Incoming request origin:", origin);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log("Allowing request with no origin");
      return callback(null, true);
    }

    const allowedOrigins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      "https://audio-alchemy-tau.vercel.app",
      "https://audioalchemy-gszy.onrender.com",
    ];

    // In production, be more permissive
    if (process.env.NODE_ENV === "production") {
      const vercelDomain = ".vercel.app";
      const renderDomain = ".onrender.com";
      if (origin.endsWith(vercelDomain) || origin.endsWith(renderDomain)) {
        console.log("Allowing production domain:", origin);
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) {
      console.log("Allowing whitelisted origin:", origin);
      callback(null, true);
    } else {
      console.log("Blocking origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Range"],
  exposedHeaders: [
    "Content-Type",
    "Authorization",
    "Content-Range",
    "Accept-Ranges",
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options("*", cors(corsOptions));

// Add request logging middleware
app.use((req, res, next) => {
  console.log("Incoming request:", {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    contentType: req.headers["content-type"],
    contentLength: req.headers["content-length"],
    authorization: req.headers.authorization ? "present" : "missing",
  });
  next();
});

// Body parsing middleware
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/templates", require("./routes/templates"));

// Serve static files with proper CORS and headers
const serveStatic = (directory, route) => {
  app.use(
    route,
    (req, res, next) => {
      // Add CORS headers for audio files
      res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
        "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges",
      });

      // Handle OPTIONS request
      if (req.method === "OPTIONS") {
        return res.status(204).end();
      }

      next();
    },
    express.static(directory, {
      setHeaders: (res, path) => {
        if (path.endsWith(".wav") || path.endsWith(".mp3")) {
          res.set({
            "Accept-Ranges": "bytes",
            "Content-Type": path.endsWith(".wav") ? "audio/wav" : "audio/mpeg",
          });
        }
      },
    })
  );
};

// Serve each upload directory separately
serveStatic(PROCESSED_DIR, "/uploads/processed");
serveStatic(MIXED_DIR, "/uploads/mixed");
serveStatic(STEMS_DIR, "/uploads/stems");

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers,
  });
  res.status(500).json({ message: err.message });
});

// Database connection
const mongooseOptions = {
  dbName: "itMix",
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
