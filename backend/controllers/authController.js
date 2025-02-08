const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { validationResult } = require("express-validator");

exports.register = async (req, res) => {
  try {
    console.log("Starting registration process");
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      console.log("Registration validation failed:", {
        email,
        name,
        hasPassword: !!password,
      });
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      console.log("User already exists:", { email });
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    console.log("Creating new user:", { email, name });
    user = new User({
      email,
      password,
      name,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();
    console.log("User saved successfully:", { userId: user._id });

    // Create token
    const payload = {
      userId: user._id,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        console.log("Token generated successfully");
        res.status(201).json({
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    console.log("Processing login request");
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create token
    const payload = {
      userId: user._id,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        console.log("Login successful, token generated");
        res.json({
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Validate token middleware
exports.validateToken = async (req, res) => {
  try {
    console.log("Validating token");
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      console.log("User not found for token");
      return res.status(404).json({ message: "User not found" });
    }
    console.log("Token validation successful:", { userId: user._id });
    res.json(user);
  } catch (error) {
    console.error("Token validation error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error validating token",
      error: error.message,
    });
  }
};

// Add a test route to verify the server is running
exports.test = async (req, res) => {
  res.json({ message: "Auth server is running" });
};
