#!/bin/bash

# Create test directories
mkdir -p test/audio/{voice,music,mixed}

# Download test files (replace URLs with actual test files)
# Voice samples
curl -o test/audio/voice/clean.wav "https://example.com/clean-voice.wav"
curl -o test/audio/voice/reverb.wav "https://example.com/reverb-voice.wav"
curl -o test/audio/voice/noisy.wav "https://example.com/noisy-voice.wav"

# Music samples
curl -o test/audio/music/acoustic.wav "https://example.com/acoustic.wav"
curl -o test/audio/music/electronic.wav "https://example.com/electronic.wav"
curl -o test/audio/music/orchestral.wav "https://example.com/orchestral.wav"

# Run analysis on all files
echo "=== Testing Voice Files ==="
for file in test/audio/voice/*.wav; do
    python3 scripts/test_analysis.py "$file"
done

echo -e "\n=== Testing Music Files ==="
for file in test/audio/music/*.wav; do
    python3 scripts/test_analysis.py "$file"
done

# Test processing
echo -e "\n=== Testing Audio Processing ==="
node scripts/test_processing.js 