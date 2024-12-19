#!/usr/bin/env python3
import sys
import json
import os
import subprocess
import time
from pymediainfo import MediaInfo

def analyze_omf(input_path):
    """Analyze OMF file structure"""
    try:
        print("\n=== Analyzing OMF File ===", file=sys.stderr)
        media_info = MediaInfo.parse(input_path)
        
        for track in media_info.tracks:
            print(f"\nTrack Type: {track.track_type}", file=sys.stderr)
            for key, value in track.to_data().items():
                print(f"{key}: {value}", file=sys.stderr)
        
        return media_info
    except Exception as e:
        print(f"Analysis error: {str(e)}", file=sys.stderr)
        return None

def convert_omf_to_wav(input_path, output_path):
    """Convert OMF to WAV using multiple methods"""
    try:
        print(f"\n=== Converting OMF to WAV ===", file=sys.stderr)
        
        # Analyze file first
        analyze_omf(input_path)
        
        # Different conversion approaches
        approaches = [
            {
                'name': 'Direct extraction',
                'command': [
                    'ffmpeg',
                    '-i', input_path,
                    '-vn',
                    '-acodec', 'pcm_s24le',
                    '-ar', '48000',
                    '-ac', '2',
                    '-y',
                    '-v', 'debug',
                    output_path
                ]
            },
            {
                'name': 'Raw audio extraction',
                'command': [
                    'ffmpeg',
                    '-f', 'lavfi',
                    '-i', f"movie={input_path}",
                    '-vn',
                    '-acodec', 'pcm_s24le',
                    '-ar', '48000',
                    '-y',
                    output_path
                ]
            },
            {
                'name': 'Copy stream',
                'command': [
                    'ffmpeg',
                    '-i', input_path,
                    '-vn',
                    '-c:a', 'copy',
                    '-y',
                    output_path
                ]
            }
        ]
        
        for i, approach in enumerate(approaches, 1):
            try:
                print(f"\nTrying {approach['name']} (Method {i})...", file=sys.stderr)
                print(f"Command: {' '.join(approach['command'])}", file=sys.stderr)
                
                process = subprocess.run(
                    approach['command'],
                    capture_output=True,
                    text=True
                )
                
                print(f"STDOUT: {process.stdout}", file=sys.stderr)
                print(f"STDERR: {process.stderr}", file=sys.stderr)
                
                if process.returncode == 0 and os.path.exists(output_path):
                    print(f"{approach['name']} succeeded!", file=sys.stderr)
                    return True
                else:
                    print(f"{approach['name']} failed with code {process.returncode}", file=sys.stderr)
            except Exception as e:
                print(f"Error with {approach['name']}: {str(e)}", file=sys.stderr)
                continue
        
        raise Exception("All conversion methods failed")
    except Exception as e:
        print(f"Error in conversion: {str(e)}", file=sys.stderr)
        return False

def main():
    if len(sys.argv) != 3:
        print('Usage: omf_converter.py <input_file> <output_file>')
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if convert_omf_to_wav(input_path, output_path):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main() 