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

// Create required directories
[UPLOAD_DIR, STEMS_DIR, PROCESSED_DIR, MIXED_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const app = express();

// Basic CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/templates", require("./routes/templates"));

// Serve static files
app.use("/uploads", express.static(UPLOAD_DIR));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
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
