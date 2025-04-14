const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const omfParser = require('./omfParser');

class AudioAnalysisService {
  async analyzeContainer(filePath) {
    try {
      console.log('Starting audio analysis for:', filePath);
      
      // Check if file exists
      await fs.access(filePath);
      console.log('Source file exists');
      
      const extension = path.extname(filePath).toLowerCase();
      if (extension === '.omf' || extension === '.aaf') {
        console.log('Processing OMF/AAF file');
        return await omfParser.parseFile(filePath);
      }
      
      // Regular audio file processing continues below...
    } catch (error) {
      console.error('Audio analysis error:', error);
      throw new Error(`Failed to analyze audio file: ${error.message}`);
    }
  }
}

module.exports = new AudioAnalysisService(); 