const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    console.log("Auth middleware:", {
      method: req.method,
      path: req.path,
      origin: req.get("origin"),
      host: req.get("host"),
    });

    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("No authorization header");
      return res.status(401).json({ message: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("No token in authorization header");
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment");
      return res.status(500).json({ message: "Server configuration error" });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token is expired
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        console.log("Token expired");
        return res.status(401).json({ message: "Token expired" });
      }

      // Add user ID to request
      req.userId = decoded.userId;
      console.log("Token verified for user:", decoded.userId);

      next();
    } catch (jwtError) {
      console.error("JWT verification failed:", {
        error: jwtError.message,
        name: jwtError.name,
      });

      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }

      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
