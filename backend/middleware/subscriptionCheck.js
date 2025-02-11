const Subscription = require("../models/subscription");

const subscriptionCheck = {
  // Check if user can create more projects
  canCreateProject: async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        console.log("No user found in request:", { user: req.user });
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log("Checking project creation access for user:", req.user._id);

      const subscription = await Subscription.findOne({ userId: req.user._id });
      if (!subscription) {
        console.log("Creating new PRO subscription for user:", req.user._id);
        const newSubscription = new Subscription({
          userId: req.user._id,
          plan: "PRO",
          features: {
            projectLimit: Infinity,
            storageLimit: 10,
            allowedFileTypes: ["mp3", "wav", "flac"],
            allowAdvancedFeatures: true,
            allowStemDownload: true,
            allowBatchProcessing: false,
            allowApiAccess: false,
          },
        });
        await newSubscription.save();
        console.log("PRO subscription created successfully");
        next();
        return;
      }

      const canCreate = await subscription.canCreateProject();
      if (!canCreate) {
        return res.status(403).json({
          message: "Project limit reached for your current plan",
          upgrade: true,
        });
      }

      next();
    } catch (error) {
      console.error("Project creation check error:", {
        error: error.message,
        stack: error.stack,
        user: req.user?._id,
      });
      res.status(500).json({ message: "Server error" });
    }
  },

  // Check if user has enough storage
  hasStorageSpace: async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const subscription = await Subscription.findOne({ userId: req.user._id });
      if (!subscription) {
        // Create a PRO subscription for testing
        const newSubscription = new Subscription({
          userId: req.user._id,
          plan: "PRO",
          features: {
            projectLimit: Infinity,
            storageLimit: 10,
            allowedFileTypes: ["mp3", "wav", "flac"],
            allowAdvancedFeatures: true,
            allowStemDownload: true,
            allowBatchProcessing: false,
            allowApiAccess: false,
          },
        });
        await newSubscription.save();
        next();
        return;
      }

      const fileSize = req.headers["content-length"]
        ? parseInt(req.headers["content-length"])
        : 0;
      const hasSpace = await subscription.hasStorageSpace(fileSize);

      if (!hasSpace) {
        return res.status(403).json({
          message: "Storage limit reached for your current plan",
          upgrade: true,
        });
      }

      next();
    } catch (error) {
      console.error("Storage check error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Check if user can access advanced features
  canAccessAdvancedFeatures: async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        console.log("No user found in request:", { user: req.user });
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log("Checking advanced features access for user:", req.user._id);

      let subscription = await Subscription.findOne({ userId: req.user._id });
      if (!subscription) {
        console.log("Creating new PRO subscription for user:", req.user._id);
        subscription = new Subscription({
          userId: req.user._id,
          plan: "PRO",
          status: "active",
          features: {
            projectLimit: Infinity,
            storageLimit: 10,
            allowedFileTypes: ["mp3", "wav", "flac"],
            allowAdvancedFeatures: true,
            allowStemDownload: true,
            allowBatchProcessing: false,
            allowApiAccess: false,
          },
        });
        await subscription.save();
        console.log("PRO subscription created successfully");
      } else if (!subscription.features.allowAdvancedFeatures) {
        console.log("Upgrading subscription to PRO for user:", req.user._id);
        subscription.plan = "PRO";
        subscription.status = "active";
        subscription.features = {
          projectLimit: Infinity,
          storageLimit: 10,
          allowedFileTypes: ["mp3", "wav", "flac"],
          allowAdvancedFeatures: true,
          allowStemDownload: true,
          allowBatchProcessing: false,
          allowApiAccess: false,
        };
        await subscription.save();
        console.log("Subscription upgraded to PRO successfully");
      }

      next();
    } catch (error) {
      console.error("Feature access check error:", {
        error: error.message,
        stack: error.stack,
        user: req.user?._id,
      });
      res.status(500).json({ message: "Server error" });
    }
  },

  // Check if user can download stems
  canDownloadStems: async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        console.log("No user found in request:", { user: req.user });
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log("Checking stem download access for user:", req.user._id);

      const subscription = await Subscription.findOne({ userId: req.user._id });
      if (!subscription) {
        console.log("Creating new PRO subscription for user:", req.user._id);
        const newSubscription = new Subscription({
          userId: req.user._id,
          plan: "PRO",
          features: {
            projectLimit: Infinity,
            storageLimit: 10,
            allowedFileTypes: ["mp3", "wav", "flac"],
            allowAdvancedFeatures: true,
            allowStemDownload: true,
            allowBatchProcessing: false,
            allowApiAccess: false,
          },
        });
        await newSubscription.save();
        console.log("PRO subscription created successfully");
        next();
        return;
      }

      console.log("Found subscription:", {
        plan: subscription.plan,
        features: subscription.features,
      });

      if (!subscription.features.allowStemDownload) {
        return res.status(403).json({
          message: "Stem download requires a premium subscription",
          upgrade: true,
        });
      }

      next();
    } catch (error) {
      console.error("Stem download check error:", {
        error: error.message,
        stack: error.stack,
        user: req.user?._id,
      });
      res.status(500).json({ message: "Server error" });
    }
  },

  // Check if user can use batch processing
  canUseBatchProcessing: async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const subscription = await Subscription.findOne({ userId: req.user._id });
      if (!subscription) {
        // Create a PRO subscription for testing
        const newSubscription = new Subscription({
          userId: req.user._id,
          plan: "PRO",
          features: {
            projectLimit: Infinity,
            storageLimit: 10,
            allowedFileTypes: ["mp3", "wav", "flac"],
            allowAdvancedFeatures: true,
            allowStemDownload: true,
            allowBatchProcessing: false,
            allowApiAccess: false,
          },
        });
        await newSubscription.save();
        next();
        return;
      }

      if (!subscription.features.allowBatchProcessing) {
        return res.status(403).json({
          message: "Batch processing requires a studio subscription",
          upgrade: true,
        });
      }

      next();
    } catch (error) {
      console.error("Batch processing check error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Check if user can access API
  canAccessApi: async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const subscription = await Subscription.findOne({ userId: req.user._id });
      if (!subscription) {
        // Create a PRO subscription for testing
        const newSubscription = new Subscription({
          userId: req.user._id,
          plan: "PRO",
          features: {
            projectLimit: Infinity,
            storageLimit: 10,
            allowedFileTypes: ["mp3", "wav", "flac"],
            allowAdvancedFeatures: true,
            allowStemDownload: true,
            allowBatchProcessing: false,
            allowApiAccess: false,
          },
        });
        await newSubscription.save();
        next();
        return;
      }

      if (!subscription.features.allowApiAccess) {
        return res.status(403).json({
          message: "API access requires a studio subscription",
          upgrade: true,
        });
      }

      next();
    } catch (error) {
      console.error("API access check error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = subscriptionCheck;
