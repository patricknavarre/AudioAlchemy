const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");

// Define upload directories
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/var/data/audioalchemy")
    : path.join(__dirname, "../uploads");
const MIXED_DIR = path.join(UPLOAD_DIR, "mixed");

class AudioProcessor {
  constructor() {
    this.checkFFmpeg();
  }

  async checkFFmpeg() {
    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error("FFmpeg check failed:", err);
          reject(err);
        } else {
          console.log(
            "FFmpeg is available with formats:",
            Object.keys(formats)
          );
          resolve(formats);
        }
      });
    });
  }

  async processAudioFile(inputPath, outputPath) {
    try {
      // High-quality audio processing chain
      const filters = [
        // Maintain original sample rate and bit depth
        "aresample=async=1000",
        // Professional-grade normalization
        "dynaudnorm=p=0.95:m=100:s=12:g=15",
        // Studio-quality compression
        "acompressor=threshold=-24dB:ratio=2:attack=20:release=200:makeup=2",
        // Clarity enhancement
        "highpass=f=40",
        "lowpass=f=18000",
        // Stereo field adjustment
        "stereotools=mlev=1:slev=1:sbal=0",
      ];

      return new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath)
          .toFormat("wav")
          .audioCodec("pcm_s24le") // 24-bit audio
          .audioFrequency(48000) // Professional sample rate
          .audioChannels(2) // Stereo
          .audioFilters(filters);

        command
          .on("error", (err) => {
            console.error("FFmpeg processing error:", err);
            reject(err);
          })
          .on("end", () => {
            console.log("FFmpeg processing completed:", {
              input: inputPath,
              output: outputPath,
            });
            resolve({ processedPath: outputPath, filters });
          })
          .save(outputPath);
      });
    } catch (error) {
      console.error("Audio processing error:", {
        file: path.basename(inputPath),
        error: error.message,
      });
      throw error;
    }
  }

  async measureLoudness(filePath) {
    return new Promise((resolve, reject) => {
      let stderr = "";

      // Convert relative path to absolute path if needed
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(UPLOAD_DIR, filePath);

      // Check if file exists before proceeding
      if (!fsSync.existsSync(absolutePath)) {
        console.error("File not found:", {
          requestedPath: filePath,
          absolutePath: absolutePath,
        });
        return reject(new Error(`File not found: ${absolutePath}`));
      }

      console.log("Measuring loudness for file:", {
        requestedPath: filePath,
        absolutePath: absolutePath,
        exists: fsSync.existsSync(absolutePath),
      });

      const command = ffmpeg(absolutePath)
        .audioFilters("ebur128=peak=true:framelog=verbose")
        .outputOptions(["-f", "null"])
        .on("error", (err) => {
          console.error("FFmpeg loudness measurement error:", {
            error: err.message,
            filePath: absolutePath,
          });
          reject(err);
        })
        .on("stderr", (stderrLine) => {
          stderr += stderrLine + "\n";
        })
        .on("end", () => {
          try {
            console.log("FFmpeg stderr output:", stderr);
            const measurements = {
              integratedLoudness: null,
              loudnessRange: null,
              truePeakMax: null,
            };

            // Parse the EBU R128 output
            const lines = stderr.split("\n");
            for (const line of lines) {
              if (line.includes("I:")) {
                measurements.integratedLoudness = parseFloat(
                  line.split("I:")[1]
                );
              } else if (line.includes("LRA:")) {
                measurements.loudnessRange = parseFloat(line.split("LRA:")[1]);
              } else if (line.includes("Peak:")) {
                measurements.truePeakMax = parseFloat(line.split("Peak:")[1]);
              }
            }

            console.log("Parsed measurements:", measurements);
            resolve(measurements);
          } catch (error) {
            console.error("Error parsing loudness measurements:", error);
            reject(error);
          }
        });

      command.output("/dev/null").run();
    });
  }

  async normalizeLoudness(inputPath, outputPath, targetLUFS = -23) {
    try {
      // First measure current loudness
      const measurements = await this.measureLoudness(inputPath);

      // Calculate required gain adjustment
      const gainAdjustment = targetLUFS - measurements.integratedLoudness;

      // Apply loudness normalization
      return new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath)
          .audioFilters([
            // Apply gain adjustment
            `volume=${gainAdjustment}dB`,
            // Ensure true peaks don't exceed -1 dBTP
            "acompressor=threshold=-1:ratio=20:attack=5:release=50",
          ])
          .toFormat("wav")
          .audioCodec("pcm_s24le")
          .audioFrequency(48000)
          .on("error", (err) => {
            console.error("FFmpeg normalization error:", err);
            reject(err);
          })
          .on("end", () => {
            resolve({
              normalizedPath: outputPath,
              originalLoudness: measurements.integratedLoudness,
              adjustedBy: gainAdjustment,
              targetLUFS,
            });
          })
          .save(outputPath);
      });
    } catch (error) {
      console.error("Loudness normalization error:", error);
      throw error;
    }
  }

  async mixAudioFiles(files, outputPath, gainAdjustment = 0) {
    return new Promise((resolve, reject) => {
      try {
        console.log("Starting mix with files:", files);
        console.log("Applying gain adjustment:", gainAdjustment, "dB");

        if (!files || files.length === 0) {
          throw new Error("No files to mix");
        }

        const command = ffmpeg();

        // Add input files
        files.forEach((file) => {
          if (!file.processedPath) {
            throw new Error(`Missing processedPath for file`);
          }
          command.input(file.processedPath);
        });

        // Create complex filter for mixing with volume adjustments
        const volumeFilters = files
          .map((file, index) => {
            const volume = file.volume || 1;
            return `[${index}:a]volume=${volume}[v${index}]`;
          })
          .join(";");
        const volumeInputs = files.map((_, index) => `[v${index}]`).join("");

        // Build the complex filter chain:
        // 1. Apply individual track volumes
        // 2. Mix all tracks
        // 3. Apply loudness normalization
        // 4. Apply gain adjustment
        let complexFilter = `${volumeFilters};`;
        complexFilter += `${volumeInputs}amix=inputs=${files.length}:duration=longest:dropout_transition=0[mixed];`;
        complexFilter += `[mixed]loudnorm=I=-23:TP=-1:LRA=11[normalized];`;

        // Apply gain adjustment after normalization
        if (gainAdjustment !== 0) {
          complexFilter += `[normalized]volume=${gainAdjustment}dB[aout]`;
        } else {
          // If no gain adjustment needed, just use a copy filter
          complexFilter += `[normalized]acopy[aout]`;
        }

        console.log("Complex filter:", complexFilter);

        command
          .complexFilter(complexFilter)
          .outputOptions(["-map", "[aout]"])
          .audioChannels(2)
          .audioFrequency(48000)
          .audioCodec("pcm_s24le")
          .toFormat("wav");

        command
          .on("start", (cmd) => {
            console.log("Started FFmpeg with command:", cmd);
          })
          .on("error", (err) => {
            console.error("FFmpeg error:", err);
            reject(err);
          })
          .on("end", () => {
            console.log("Mix completed successfully:", {
              outputPath,
              gainAdjustment,
            });
            resolve(outputPath);
          });

        command.save(outputPath);
      } catch (error) {
        console.error("Mix setup error:", error);
        reject(error);
      }
    });
  }
}

module.exports = new AudioProcessor();
