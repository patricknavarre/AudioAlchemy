const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

// Debug middleware for auth routes
router.use((req, res, next) => {
  console.log("Auth request:", {
    method: req.method,
    path: req.path,
    body:
      req.method === "POST"
        ? {
            email: req.body.email,
            name: req.body.name,
            // Don't log the password
            hasPassword: !!req.body.password,
          }
        : undefined,
    headers: {
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
      origin: req.headers.origin,
      authorization: req.headers.authorization ? "[exists]" : "[missing]",
    },
  });
  next();
});

// Register route with error handling
router.post("/register", async (req, res) => {
  try {
    console.log("Processing registration request");
    const result = await authController.register(req, res);
    console.log("Registration successful:", {
      userId: result?.user?._id,
      email: result?.user?.email,
    });
    return result;
  } catch (error) {
    console.error("Registration error:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

// Login route with error handling
router.post("/login", async (req, res) => {
  try {
    console.log("Processing login request:", {
      email: req.body.email,
      hasPassword: !!req.body.password,
      headers: req.headers,
    });

    if (!req.body.email || !req.body.password) {
      console.log("Missing required fields");
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await authController.login(req, res);
    console.log("Login processed successfully");
    return result;
  } catch (error) {
    console.error("Login error:", {
      message: error.message,
      stack: error.stack,
      type: error.name,
    });
    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

// Token validation endpoint
router.get("/validate", auth, (req, res) => {
  try {
    console.log("Token validation request:", {
      userId: req.userId,
      method: req.method,
      path: req.path,
    });
    res.status(200).json({ valid: true, userId: req.userId });
  } catch (error) {
    console.error("Token validation error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(401).json({ valid: false, message: "Invalid token" });
  }
});

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Auth server is running" });
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error("Auth route error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Ensure CORS headers are set for errors
  const origin = req.headers.origin;
  if (
    origin === "https://audio-alchemy-tau.vercel.app" ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:7000"
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.status(err.status || 500).json({
    message: err.message || "Authentication error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

module.exports = router;
