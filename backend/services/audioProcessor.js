const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");

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

  async mixAudioFiles(files, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        console.log("Starting mix with files:", files);

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
        const filterInputs = files.map((_, index) => `[${index}:a]`).join("");
        const volumeFilters = files
          .map((file, index) => {
            const volume = file.volume || 1;
            return `[${index}:a]volume=${volume}[v${index}]`;
          })
          .join(";");
        const volumeInputs = files.map((_, index) => `[v${index}]`).join("");
        const complexFilter = `${volumeFilters};${volumeInputs}amix=inputs=${files.length}:duration=longest:dropout_transition=0[aout]`;

        command
          .complexFilter(complexFilter)
          .outputOptions(["-map", "[aout]"])
          .audioChannels(2)
          .audioFrequency(48000) // Professional sample rate
          .audioCodec("pcm_s24le") // 24-bit audio
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
            console.log("Mix completed successfully:", outputPath);
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
