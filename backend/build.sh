#!/bin/bash

# Install dependencies
npm install

# Create necessary directories
mkdir -p uploads/stems
mkdir -p uploads/processed
mkdir -p uploads/mixed

# Install FFmpeg
apt-get update
apt-get install -y ffmpeg

# Verify FFmpeg installation
ffmpeg -version

echo "Build completed successfully!" 