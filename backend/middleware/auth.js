const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    console.log("Auth middleware - checking token");
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      console.log("No token provided in Authorization header");
      return res
        .status(401)
        .json({ message: "No authentication token provided" });
    }

    console.log("Verifying token");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified, finding user:", decoded.userId);

    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log("User not found for ID:", decoded.userId);
      return res.status(401).json({ message: "User not found" });
    }

    console.log("User found, setting on request:", user._id);
    // Set both user and user._id for backward compatibility
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error("Authentication error:", {
      error: error.message,
      stack: error.stack,
      token: req.header("Authorization") ? "[exists]" : "[missing]",
    });
    res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = auth;
