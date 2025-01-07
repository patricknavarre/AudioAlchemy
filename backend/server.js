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
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
      console.log(`Created directory: ${dir}`);
    }
    // Ensure proper permissions
    fs.chmodSync(dir, 0o777);
    console.log(`Set permissions for directory: ${dir}`);
  } catch (error) {
    console.error(
      `Error creating/setting permissions for directory ${dir}:`,
      error
    );
    // Don't exit process, just log the error
  }
});

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    "https://audio-alchemy-tau.vercel.app",
    "https://audioalchemy-gszy.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Range",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    "X-Requested-With",
  ],
  exposedHeaders: [
    "Content-Type",
    "Authorization",
    "Content-Range",
    "Accept-Ranges",
    "Content-Length",
    "Access-Control-Allow-Origin",
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", corsOptions.methods.join(","));
    res.header(
      "Access-Control-Allow-Headers",
      corsOptions.allowedHeaders.join(",")
    );
    res.header("Access-Control-Max-Age", corsOptions.maxAge);
    res.status(204).end();
  } else {
    res.status(403).json({ message: "CORS not allowed for this origin" });
  }
});

// Add request logging middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Set CORS headers for allowed origins
  if (corsOptions.origin.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", corsOptions.methods.join(","));
    res.header(
      "Access-Control-Allow-Headers",
      corsOptions.allowedHeaders.join(",")
    );
    res.header(
      "Access-Control-Expose-Headers",
      corsOptions.exposedHeaders.join(",")
    );
    res.header("Access-Control-Max-Age", corsOptions.maxAge);

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
  }

  console.log("Incoming request:", {
    method: req.method,
    path: req.path,
    origin: origin,
    host: req.headers.host,
    contentType: req.headers["content-type"],
    contentLength: req.headers["content-length"],
    authorization: req.headers.authorization ? "present" : "missing",
  });

  next();
});

// Add response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    console.log("Response:", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      origin: req.headers.origin,
    });
    return originalSend.call(this, data);
  };
  next();
});

// Body parsing middleware with increased limits
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/templates", require("./routes/templates"));

// Serve static files with proper CORS and headers
const serveStatic = (directory, route) => {
  app.use(
    route,
    (req, res, next) => {
      const origin = req.headers.origin;

      // Set CORS headers for allowed origins
      if (corsOptions.origin.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.header(
          "Access-Control-Allow-Headers",
          corsOptions.allowedHeaders.join(",")
        );
        res.header(
          "Access-Control-Expose-Headers",
          corsOptions.exposedHeaders.join(",")
        );
      }

      if (req.method === "OPTIONS") {
        return res.status(204).end();
      }

      next();
    },
    express.static(directory, {
      setHeaders: (res, filePath) => {
        const origin = req.headers.origin;
        if (corsOptions.origin.includes(origin)) {
          res.set("Access-Control-Allow-Origin", origin);
        }

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

// Serve each upload directory separately with proper paths
app.use(
  "/api/projects/processed",
  express.static(PROCESSED_DIR, {
    setHeaders: (res, filePath) => {
      res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Accept-Ranges": "bytes",
        "Content-Type": filePath.endsWith(".wav") ? "audio/wav" : "audio/mpeg",
        "Cache-Control": "no-cache",
        "Content-Disposition": "inline",
      });
    },
  })
);
app.use(
  "/api/projects/mixed",
  express.static(MIXED_DIR, {
    setHeaders: (res, filePath) => {
      res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Accept-Ranges": "bytes",
        "Content-Type": filePath.endsWith(".wav") ? "audio/wav" : "audio/mpeg",
        "Cache-Control": "no-cache",
        "Content-Disposition": "inline",
      });
    },
  })
);
app.use(
  "/api/projects/stems",
  express.static(STEMS_DIR, {
    setHeaders: (res, filePath) => {
      res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Accept-Ranges": "bytes",
        "Content-Type": filePath.endsWith(".wav") ? "audio/wav" : "audio/mpeg",
        "Cache-Control": "no-cache",
        "Content-Disposition": "inline",
      });
    },
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers,
  });

  // Ensure error response has CORS headers
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range"
  );

  res.status(500).json({ message: err.message });
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
