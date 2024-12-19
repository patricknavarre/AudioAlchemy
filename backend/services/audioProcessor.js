const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { spawn } = require('child_process');

class AudioProcessor {
  constructor() {
    // Check FFmpeg installation on initialization
    this.checkFFmpeg();
  }

  async checkFFmpeg() {
    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('FFmpeg check failed:', err);
          reject(err);
        } else {
          console.log('FFmpeg is available with formats:', Object.keys(formats));
          resolve(formats);
        }
      });
    });
  }

  async analyzeAudio(filePath) {
    return new Promise((resolve, reject) => {
      console.log('Starting audio analysis for:', filePath);
      const pythonScript = path.join(__dirname, '..', 'scripts', 'audio_analyzer.py');
      
      // Use the system Python path
      const pythonPath = '/usr/local/bin/python3';
      console.log('Using Python path:', pythonPath);
      console.log('Using Python script:', pythonScript);
      
      const process = spawn(pythonPath, [pythonScript, filePath]);
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', data => {
        console.log('Python stdout:', data.toString());
        stdout += data;
      });

      process.stderr.on('data', data => {
        console.log('Python stderr:', data.toString());
        stderr += data;
      });

      process.on('close', code => {
        console.log('Python process exited with code:', code);
        if (code !== 0) {
          reject(new Error(`Analysis failed: ${stderr}`));
        } else {
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(new Error(`Failed to parse analysis data: ${e.message}`));
          }
        }
      });

      // Add timeout
      setTimeout(() => {
        process.kill();
        reject(new Error('Analysis timed out after 30 seconds'));
      }, 30000);
    });
  }

  async processAudioFiles(files, outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
    const processedFiles = [];
    
    for (const file of files) {
      const outputPath = path.join(outputDir, `processed_${path.basename(file.path)}`);
      try {
        // First just copy the file as a fallback
        await fs.copyFile(file.path, outputPath);
        
        // Try to analyze and process, but don't fail if it doesn't work
        try {
          await this.processAudioFile(file.path, outputPath);
        } catch (analysisError) {
          console.warn('Audio analysis failed, using original file:', analysisError);
          // We already copied the file, so just continue
        }

        processedFiles.push({
          originalPath: file.path,
          processedPath: outputPath
        });
        
        console.log('Processed file:', {
          input: file.path,
          output: outputPath
        });

      } catch (error) {
        console.error(`Error processing file ${file.path}:`, error);
      }
    }
    
    return processedFiles;
  }

  async processAudioFile(inputPath, outputPath) {
    try {
      const analysis = await this.analyzeAudio(inputPath);
      console.log('Audio analysis:', analysis);

      const filters = [];
      
      // Only apply EQ if there are severe frequency issues
      if (analysis.issues.muddy && analysis.frequency.bands.lowMids.energy > 3.0) {
        filters.push({
          filter: 'equalizer',
          options: {
            f: analysis.frequency.bands.lowMids.centroid,
            w: 2.0,    // Very wide Q for subtle, musical changes
            g: -0.75   // Very gentle cut
          }
        });
      }

      if (analysis.issues.harsh && analysis.frequency.bands.presence.energy > 0.3) {
        filters.push({
          filter: 'equalizer',
          options: {
            f: analysis.frequency.bands.presence.peak_freq,
            w: 1.5,    // Wide Q
            g: -1.0    // Very gentle cut
          }
        });
      }

      // Only compress if the dynamic range is extremely wide
      if (analysis.dynamics.crestFactor > 25) {
        filters.push({
          filter: 'compand',
          options: {
            attacks: '0.1,0.3',      // Very slow attack
            decays: '0.5,1.0',       // Very slow release
            points: '-70/-70,-40/-35,0/0'  // Very gentle compression
          }
        });
      }

      // Skip phase correction unless absolutely necessary
      if (analysis.issues.phaseCancellation && analysis.stereo.correlation < 0.2) {
        filters.push({
          filter: 'aphaser',
          options: {
            in_gain: 0.9,
            out_gain: 0.95
          }
        });
      }

      // Only adjust stereo if it's causing real problems
      if (analysis.issues.excessiveStereoWidth && analysis.stereo.width_ratio > 2.5) {
        filters.push({
          filter: 'stereotools',
          options: {
            mlev: 0.85,  // Very subtle mid adjustment
            slev: 0.6    // Very subtle side adjustment
          }
        });
      }

      // Only apply noise reduction for very noticeable noise
      if (analysis.frequency.spectralFeatures.flatness > 0.7) {
        filters.push({
          filter: 'anlmdn',
          options: {
            s: Math.min(0.2, analysis.frequency.spectralFeatures.flatness) // Very gentle noise reduction
          }
        });
      }

      // Skip transient shaping unless there are serious transient issues
      if (analysis.rhythm.transientDensity > 0.95) {
        filters.push({
          filter: 'agate',
          options: {
            threshold: 0.4,
            ratio: 1.2,      // Very gentle ratio
            attack: '20',    // Very slow attack
            release: '200'   // Very slow release
          }
        });
      }

      console.log('Applying filters:', filters);

      // If no processing is needed, just copy the file
      if (filters.length === 0) {
        console.log('No processing needed, copying file...');
        await fs.copyFile(inputPath, outputPath);
        return outputPath;
      }

      return new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath)
          .toFormat('wav')
          .audioChannels(2)
          .audioFrequency(48000)
          .audioCodec('pcm_s24le');

        if (filters.length > 0) {
          const filterString = filters.map(f => {
            const options = Object.entries(f.options)
              .map(([key, value]) => `${key}=${value}`)
              .join(':');
            return `${f.filter}=${options}`;
          }).join(',');

          command.audioFilters(filterString);
        }

        command
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(err);
          })
          .on('end', () => {
            console.log('Processing finished:', outputPath);
            resolve(outputPath);
          })
          .save(outputPath);
      });
    } catch (error) {
      console.error('Processing error:', error);
      throw error;
    }
  }

  async mixAudioFiles(files, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting mix with files:', files);

        // Basic validation
        if (!files || files.length === 0) {
          throw new Error('No files to mix');
        }

        // Create FFmpeg command
        const command = ffmpeg();

        // Add each input file
        files.forEach((file, index) => {
          if (!file.processedPath) {
            throw new Error(`Missing processedPath for file ${index}`);
          }
          if (!fsSync.existsSync(file.processedPath)) {
            throw new Error(`File not found: ${file.processedPath}`);
          }
          command.input(file.processedPath);
          console.log(`Added input ${index}:`, file.processedPath);
        });

        // Ensure output directory exists
        fsSync.mkdirSync(path.dirname(outputPath), { recursive: true });

        // Create complex filter for mixing
        const filterInputs = files.map((_, index) => `[${index}:a]`).join('');
        const complexFilter = `${filterInputs}amix=inputs=${files.length}:duration=longest[aout]`;

        // Configure output with complex filter
        command
          .complexFilter(complexFilter)
          .outputOptions(['-map', '[aout]'])
          .audioChannels(2)
          .audioFrequency(48000)
          .audioCodec('pcm_s24le')
          .toFormat('wav')
          .on('start', (cmd) => {
            console.log('Started FFmpeg with command:', cmd);
          })
          .on('stderr', (stderrLine) => {
            console.log('FFmpeg stderr:', stderrLine);
          })
          .on('error', (err, stdout, stderr) => {
            console.error('FFmpeg error:', {
              error: err.message,
              stdout: stdout,
              stderr: stderr
            });
            reject(new Error(`FFmpeg error: ${err.message}`));
          })
          .on('end', () => {
            if (fsSync.existsSync(outputPath)) {
              console.log('Mix completed successfully:', outputPath);
              resolve(outputPath);
            } else {
              reject(new Error('Output file was not created'));
            }
          });

        // Save the output
        console.log('Saving mix to:', outputPath);
        command.save(outputPath);

      } catch (error) {
        console.error('Mix setup error:', error);
        reject(error);
      }
    });
  }
}

// Export a singleton instance instead of the class
module.exports = new AudioProcessor(); 