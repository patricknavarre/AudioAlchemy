const path = require("path");
const fs = require("fs").promises;
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

ffmpeg.setFfmpegPath(ffmpegPath);

// Constants for file paths
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/var/data/audioalchemy")
    : path.join(__dirname, "../uploads");

const STEMS_DIR = path.join(UPLOAD_DIR, "stems");

// Ensure directories exist
(async () => {
  try {
    await fs.mkdir(STEMS_DIR, { recursive: true });
    console.log("Stems directory created/verified:", STEMS_DIR);
  } catch (error) {
    console.error("Error creating stems directory:", error);
  }
})();

const separateStems = async (req, res) => {
  try {
    console.log("Starting stem separation request:", {
      user: req.user?._id,
      file: req.file,
      body: req.body,
    });

    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    // Verify file size and type
    if (req.file.size > 100 * 1024 * 1024) {
      // 100MB limit
      return res
        .status(400)
        .json({ message: "File size must be less than 100MB" });
    }

    if (!req.file.mimetype.startsWith("audio/")) {
      return res.status(400).json({ message: "File must be an audio file" });
    }

    const inputFile = req.file.path;
    const fileName = path.basename(inputFile, path.extname(inputFile));
    const outputDir = path.join(STEMS_DIR, fileName);

    console.log("Processing stem separation:", {
      inputFile,
      outputDir,
      fileName,
      exists: await fileExists(inputFile),
      fileSize: req.file.size,
      fileType: req.file.mimetype,
    });

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // First, convert input to WAV format for consistent processing
    const wavFile = path.join(outputDir, "input.wav");
    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .toFormat("wav")
        .audioCodec("pcm_s16le")
        .on("error", reject)
        .on("end", resolve)
        .save(wavFile);
    });

    // Use Spleeter for high-quality stem separation
    console.log("Starting Spleeter separation...");
    try {
      const spleeterCommand = `spleeter separate -p spleeter:2stems -o "${outputDir}" "${wavFile}"`;
      const { stdout, stderr } = await execPromise(spleeterCommand);
      console.log("Spleeter output:", stdout);
      if (stderr) console.error("Spleeter stderr:", stderr);
    } catch (error) {
      console.error("Spleeter error:", error);
      throw new Error("Stem separation failed: " + error.message);
    }

    // Move and rename the separated files to match our expected structure
    const vocalsStem = path.join(outputDir, "vocals.wav");
    const accompStem = path.join(outputDir, "accompaniment.wav");

    try {
      await fs.rename(path.join(outputDir, "input", "vocals.wav"), vocalsStem);
      await fs.rename(
        path.join(outputDir, "input", "accompaniment.wav"),
        accompStem
      );
      // Clean up the temporary directory
      await fs.rmdir(path.join(outputDir, "input"), { recursive: true });
    } catch (error) {
      console.error("Error moving separated files:", error);
      throw new Error("Failed to process separated files");
    }

    // Clean up temporary files
    try {
      await fs.unlink(wavFile);
      await fs.unlink(inputFile);
    } catch (cleanupError) {
      console.error("Error cleaning up temporary files:", cleanupError);
    }

    // Verify the output files exist
    const [vocalsExists, accompExists] = await Promise.all([
      fileExists(vocalsStem),
      fileExists(accompStem),
    ]);

    console.log("Output files verification:", {
      vocalsStem,
      accompStem,
      vocalsExists,
      accompExists,
    });

    if (!vocalsExists || !accompExists) {
      throw new Error("Stem files were not created properly");
    }

    // Get the separated stem files
    const stems = {
      vocals: `/api/stems/download/${fileName}/vocals.wav`,
      accompaniment: `/api/stems/download/${fileName}/accompaniment.wav`,
    };

    console.log("Stem separation completed successfully:", {
      fileName,
      stems,
      outputExists: {
        vocals: vocalsExists,
        accompaniment: accompExists,
      },
    });

    res.json({
      message: "Stems separated successfully",
      stems,
    });
  } catch (error) {
    console.error("Error in stem separation:", {
      error: error.message,
      stack: error.stack,
      file: req.file,
    });
    res.status(500).json({
      message: "Error processing audio file",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const downloadStem = async (req, res) => {
  try {
    console.log("Starting stem download request:", {
      user: req.user?._id,
      params: req.params,
    });

    const { filename, stemType } = req.params;
    console.log("Requested stem:", { filename, stemType });

    // Sanitize the filename and stem type
    const sanitizedFilename = decodeURIComponent(filename.replace(/^\/+/, ""));
    const sanitizedStemType = stemType.endsWith(".wav")
      ? stemType
      : `${stemType}.wav`;

    // Construct the file path
    const filePath = path.join(STEMS_DIR, sanitizedFilename, sanitizedStemType);

    console.log("Attempting to download stem:", {
      filePath,
      exists: await fileExists(filePath),
    });

    if (!(await fileExists(filePath))) {
      console.error("Stem file not found:", filePath);
      return res.status(404).json({ message: "Stem file not found" });
    }

    // Set appropriate headers
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedStemType}"`
    );

    // Stream the file instead of loading it all into memory
    const stream = require("fs").createReadStream(filePath);
    stream.on("error", (error) => {
      console.error("Stream error:", error);
      res.status(500).json({ message: "Error streaming file" });
    });
    stream.pipe(res);
  } catch (error) {
    console.error("Error downloading stem:", {
      error: error.message,
      stack: error.stack,
      params: req.params,
    });
    res.status(500).json({
      message: "Error downloading stem file",
      error: error.message,
    });
  }
};

// Helper function to check if file exists
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  separateStems,
  downloadStem,
};
