const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

class OmfParser {
  async parseFile(filePath) {
    try {
      console.log('Parsing OMF/AAF file:', filePath);
      
      // Parse OMF structure using Python script
      const omfData = await this.parseOMFStructure(filePath);
      console.log('OMF structure:', omfData);

      // Create output directory
      const outputDir = path.join('uploads', 'extracted', Date.now().toString());
      await fs.mkdir(outputDir, { recursive: true });

      const tracks = [];
      
      // Extract each audio track
      for (const track of omfData.tracks) {
        const outputPath = path.join(outputDir, `${track.name.replace(/[^a-z0-9]/gi, '_')}.wav`);
        
        // Extract audio using FFmpeg
        await this.extractAudioTrack(track.source_path, outputPath, {
          startTime: track.start_time,
          duration: track.duration
        });

        const fileStats = await fs.stat(outputPath);
        tracks.push({
          originalName: track.name,
          fileName: path.basename(outputPath),
          path: outputPath,
          trackName: track.name,
          type: 'audio/wav',
          size: fileStats.size,
          metadata: {
            startTime: track.start_time,
            duration: track.duration,
            sourceStart: track.source_start
          }
        });
      }

      return tracks;
    } catch (error) {
      console.error('OMF parsing error:', error);
      throw new Error(`Failed to parse OMF file: ${error.message}`);
    }
  }

  parseOMFStructure(filePath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '..', 'scripts', 'omf_parser.py');
      const pythonPath = path.join(__dirname, '..', 'venv', 'bin', 'python3');
      const process = spawn(pythonPath, [pythonScript, filePath]);
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', data => stdout += data);
      process.stderr.on('data', data => stderr += data);

      process.on('close', code => {
        if (code !== 0) {
          reject(new Error(`OMF parser failed: ${stderr}`));
        } else {
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(new Error(`Failed to parse OMF data: ${e.message}`));
          }
        }
      });
    });
  }

  async extractAudioTrack(sourcePath, outputPath, options) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(sourcePath);
      
      if (options.startTime) {
        command.setStartTime(options.startTime);
      }
      
      if (options.duration) {
        command.setDuration(options.duration);
      }

      command
        .outputOptions([
          '-vn',
          '-acodec pcm_s24le',
          '-ar 48000'
        ])
        .on('start', cmd => console.log('FFmpeg command:', cmd))
        .on('progress', progress => console.log('Processing:', progress))
        .on('error', reject)
        .on('end', resolve)
        .save(outputPath);
    });
  }
}

module.exports = new OmfParser(); 