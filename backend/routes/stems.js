const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const stemController = require("../controllers/stemController");
const subscriptionCheck = require("../middleware/subscriptionCheck");

// Route for stem separation
router.post(
  "/separate",
  auth,
  subscriptionCheck.canAccessAdvancedFeatures,
  upload.single("audio"),
  stemController.separateStems
);

// Route for downloading separated stems - updated path pattern
router.get(
  "/download/:filename/:stemType",
  auth,
  subscriptionCheck.canDownloadStems,
  stemController.downloadStem
);

module.exports = router;
