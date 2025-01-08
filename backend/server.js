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
const allowedOrigins = [
  "https://audio-alchemy-tau.vercel.app",
  "https://audioalchemy-gszy.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

// Handle CORS before any other middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) {
    res.header("Access-Control-Allow-Origin", "*");
  } else if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, HEAD"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, Range, Origin, X-Requested-With"
  );
  res.header(
    "Access-Control-Expose-Headers",
    "Content-Range, Accept-Ranges, Content-Length"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

// Add request logging
app.use((req, res, next) => {
  console.log("Incoming request:", {
    method: req.method,
    path: req.path,
    origin: req.headers.origin || "direct request",
    host: req.headers.host,
    contentType: req.headers["content-type"],
    contentLength: req.headers["content-length"],
    authorization: req.headers.authorization ? "present" : "missing",
  });
  next();
});

// Body parsing middleware with increased limits
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

// Serve each upload directory
app.use(
  "/api/projects/processed",
  express.static(PROCESSED_DIR, {
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

app.use(
  "/api/projects/mixed",
  express.static(MIXED_DIR, {
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

app.use(
  "/api/projects/stems",
  express.static(STEMS_DIR, {
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
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const origin = req.headers.origin;
  if (!origin) {
    res.header("Access-Control-Allow-Origin", "*");
  } else if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.status(500).json({
    message: "Internal server error",
    error: err.message,
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
