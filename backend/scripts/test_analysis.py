#!/usr/bin/env python3
import sys
import os
import json
import numpy as np
from audio_analyzer import analyze_audio

def print_analysis_summary(file_path, analysis):
    """Print a human-readable summary of the audio analysis"""
    print(f"\n=== Analysis Summary for {os.path.basename(file_path)} ===")
    
    # Format info
    print("\nFormat:")
    print(f"- Sample Rate: {analysis['format']['sampleRate']} Hz")
    print(f"- Duration: {analysis['format']['duration']:.2f} seconds")
    print(f"- Channels: {analysis['format']['channels']}")
    
    # Dynamic range info
    print("\nDynamics:")
    print(f"- Peak Level: {20 * np.log10(analysis['dynamics']['peakLevel']):.1f} dB")
    print(f"- RMS Level: {20 * np.log10(analysis['dynamics']['rmsLevel']):.1f} dB")
    print(f"- Dynamic Range: {analysis['dynamics']['dynamicRange']:.1f} dB")
    print(f"- Clipping: {'Yes' if analysis['issues']['clipping'] else 'No'}")
    
    # Frequency balance
    print("\nFrequency Balance:")
    for band, data in analysis['frequency']['bands'].items():
        print(f"- {band}: Energy = {data['energy']:.3f}, Peak = {data['peak_freq']:.0f} Hz")
    
    # Issues detected
    print("\nIssues Detected:")
    for issue, detected in analysis['issues'].items():
        if detected:
            print(f"- {issue}")
    
    # For voice-specific analysis
    if analysis['balance']['harmonicPercussiveRatio'] > 1.2:
        print("\nVoice Characteristics:")
        print(f"- Harmonic/Percussive Ratio: {analysis['balance']['harmonicPercussiveRatio']:.2f}")
        print(f"- Presence Energy: {analysis['frequency']['bands']['presence']['energy']:.3f}")
    
    # For music-specific analysis
    print("\nMusical Characteristics:")
    print(f"- Tempo: {analysis['rhythm']['tempo']:.0f} BPM")
    print(f"- Transient Density: {analysis['rhythm']['transientDensity']:.3f}")

def main():
    if len(sys.argv) < 2:
        print("Usage: test_analysis.py <audio_file1> [audio_file2 ...]")
        sys.exit(1)
    
    for file_path in sys.argv[1:]:
        try:
            # Redirect stdout to capture JSON output
            old_stdout = sys.stdout
            from io import StringIO
            sys.stdout = StringIO()
            
            # Run analysis
            analyze_audio(file_path)
            
            # Get JSON output and restore stdout
            json_output = sys.stdout.getvalue()
            sys.stdout = old_stdout
            
            # Parse and print summary
            analysis = json.loads(json_output)
            print_analysis_summary(file_path, analysis)
            
        except Exception as e:
            print(f"Error analyzing {file_path}: {str(e)}")

if __name__ == "__main__":
    main() 