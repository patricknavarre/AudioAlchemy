const audioProcessor = require('../services/audioProcessor');
const path = require('path');
const fs = require('fs').promises;

async function runProcessingTests() {
    try {
        const testDir = path.join(__dirname, '../test/audio');
        const outputDir = path.join(testDir, 'processed');

        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        // Test voice processing
        console.log('\nProcessing voice files...');
        const voiceFiles = await fs.readdir(path.join(testDir, 'voice'));
        for (const file of voiceFiles) {
            const inputPath = path.join(testDir, 'voice', file);
            const outputPath = path.join(outputDir, `processed_${file}`);
            
            console.log(`\nProcessing ${file}...`);
            const analysis = await audioProcessor.analyzeAudio(inputPath);
            console.log('Analysis:', JSON.stringify(analysis, null, 2));
            
            await audioProcessor.processAudioFile(inputPath, outputPath);
            console.log(`Processed file saved to: ${outputPath}`);
        }

        // Test music processing
        console.log('\nProcessing music files...');
        const musicFiles = await fs.readdir(path.join(testDir, 'music'));
        for (const file of musicFiles) {
            const inputPath = path.join(testDir, 'music', file);
            const outputPath = path.join(outputDir, `processed_${file}`);
            
            console.log(`\nProcessing ${file}...`);
            const analysis = await audioProcessor.analyzeAudio(inputPath);
            console.log('Analysis:', JSON.stringify(analysis, null, 2));
            
            await audioProcessor.processAudioFile(inputPath, outputPath);
            console.log(`Processed file saved to: ${outputPath}`);
        }

    } catch (error) {
        console.error('Test error:', error);
    }
}

runProcessingTests(); 