const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Define upload directory based on environment
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/var/data/audioalchemy")
    : path.join(__dirname, "../uploads");

// Ensure upload directory exists
const initUploadDir = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log("Upload directory initialized:", UPLOAD_DIR);
  } catch (error) {
    console.error("Error creating upload directory:", error);
    throw error;
  }
};

// Initialize upload directory
initUploadDir().catch(console.error);

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

// File filter to allow only audio files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/flac",
    "audio/x-flac",
    "audio/aac",
    "audio/m4a",
    "audio/x-m4a",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only audio files are allowed."), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 100, // 100 MB limit
    files: 10, // Maximum 10 files per upload
  },
});

module.exports = upload;
