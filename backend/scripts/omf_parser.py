#!/usr/bin/env python3
import sys
import json
import os
import subprocess
import time
from pymediainfo import MediaInfo

def analyze_file_structure(input_path):
    """Analyze file structure using MediaInfo and file header"""
    try:
        print("\n=== Analyzing File Structure ===", file=sys.stderr)
        
        # Try to read the file header
        with open(input_path, 'rb') as f:
            header = f.read(1024)  # Read first 1KB
            print(f"File header: {header[:64].hex()}", file=sys.stderr)
            
            # Look for format markers
            markers = {
                'OMFI': header.find(b'OMFI'),
                'AIFC': header.find(b'AIFC'),
                'WAVE': header.find(b'WAVE'),
                'RIFF': header.find(b'RIFF'),
                'AAF ': header.find(b'AAF ')
            }
            
            print(f"Found markers: {markers}", file=sys.stderr)
            
            # Use MediaInfo for additional analysis
            media_info = MediaInfo.parse(input_path)
            print("\nMediaInfo analysis:", file=sys.stderr)
            
            tracks = []
            for track in media_info.tracks:
                print(f"\nTrack Type: {track.track_type}", file=sys.stderr)
                for key, value in track.to_data().items():
                    print(f"{key}: {value}", file=sys.stderr)
                
                if track.track_type in ['Audio', 'General']:
                    track_info = {
                        'name': track.track_name or 'Unnamed Track',
                        'duration': float(track.duration) / 1000 if track.duration else 0,
                        'start_time': 0,
                        'sample_rate': track.sampling_rate,
                        'channels': track.channel_s
                    }
                    tracks.append(track_info)
            
            # If no tracks found, create a default one
            if not tracks:
                tracks = [{'name': 'Track 1', 'duration': 0, 'start_time': 0}]
            
            return {
                'format': next((k for k, v in markers.items() if v >= 0), 'Unknown'),
                'tracks': tracks
            }
                
    except Exception as e:
        print(f"Error analyzing file: {str(e)}", file=sys.stderr)
        return {
            'format': 'Unknown',
            'tracks': [{'name': 'Track 1', 'duration': 0, 'start_time': 0}]
        }

def extract_audio_track(input_path, output_path, track_info=None):
    """Extract audio using ffmpeg with multiple approaches"""
    try:
        print(f"\n=== Starting Audio Extraction ===", file=sys.stderr)
        
        # Different FFmpeg approaches
        approaches = [
            {
                'name': 'Basic extraction',
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
                'name': 'AIFF extraction',
                'command': [
                    'ffmpeg',
                    '-f', 'aiff',
                    '-i', input_path,
                    '-vn',
                    '-acodec', 'pcm_s24le',
                    '-ar', '48000',
                    '-y',
                    output_path
                ]
            },
            {
                'name': 'Raw PCM extraction',
                'command': [
                    'ffmpeg',
                    '-f', 'lavfi',
                    '-i', f"movie='{input_path}'",
                    '-vn',
                    '-acodec', 'pcm_s24le',
                    '-ar', '48000',
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
                
                print(f"STDERR: {process.stderr}", file=sys.stderr)
                
                if process.returncode == 0 and os.path.exists(output_path):
                    if os.path.getsize(output_path) > 0:
                        print(f"{approach['name']} succeeded!", file=sys.stderr)
                        return True
                    else:
                        print("Output file is empty", file=sys.stderr)
                else:
                    print(f"{approach['name']} failed with code {process.returncode}", file=sys.stderr)
            except Exception as e:
                print(f"Error with {approach['name']}: {str(e)}", file=sys.stderr)
                continue
        
        raise Exception("All extraction methods failed")
    except Exception as e:
        print(f"Error in extract_audio_track: {str(e)}", file=sys.stderr)
        return False

def parse_omf(input_path):
    try:
        print("\n=== Starting File Processing ===", file=sys.stderr)
        print(f"Input file: {input_path}", file=sys.stderr)
        print(f"File exists: {os.path.exists(input_path)}", file=sys.stderr)
        print(f"File size: {os.path.getsize(input_path)}", file=sys.stderr)

        # Create output directory
        timestamp = int(time.time())
        output_dir = os.path.join('uploads', 'extracted', str(timestamp))
        os.makedirs(output_dir, exist_ok=True)
        print(f"Created output directory: {output_dir}", file=sys.stderr)

        # Analyze file structure
        file_info = analyze_file_structure(input_path)
        print(f"\nFile analysis result: {json.dumps(file_info, indent=2)}", file=sys.stderr)

        # Extract audio
        tracks = []
        for i, track_info in enumerate(file_info['tracks']):
            output_name = f"{os.path.splitext(os.path.basename(input_path))[0]}_track_{i+1}.wav"
            output_path = os.path.join(output_dir, output_name)
            
            print(f"\n=== Extracting Track {i+1} ===", file=sys.stderr)
            if extract_audio_track(input_path, output_path, track_info):
                # Get extracted file information
                audio_info = MediaInfo.parse(output_path)
                audio_track = next((t for t in audio_info.tracks if t.track_type == 'Audio'), None)
                
                if audio_track:
                    track_info = {
                        'name': track_info.get('name', f'Track {i+1}'),
                        'fileName': os.path.basename(output_path),
                        'path': output_path,
                        'start_time': track_info.get('start_time', 0),
                        'duration': float(audio_track.duration) / 1000 if audio_track.duration else track_info.get('duration', 0),
                        'source_start': 0,
                        'type': 'audio/wav',
                        'size': os.path.getsize(output_path),
                        'metadata': {
                            'channels': audio_track.channel_s,
                            'sample_rate': audio_track.sampling_rate,
                            'bit_depth': audio_track.bit_depth
                        }
                    }
                    tracks.append(track_info)
                    print(f"Track info created: {track_info}", file=sys.stderr)

        result = {
            'tracks': tracks,
            'duration': max([t['duration'] for t in tracks]) if tracks else 0,
            'file_info': file_info
        }
        
        print(f"\n=== Final Result ===", file=sys.stderr)
        print(json.dumps(result), file=sys.stderr)
        print(json.dumps(result))
        return 0
        
    except Exception as e:
        error_msg = {'error': str(e)}
        print(f"\n=== Error Occurred ===", file=sys.stderr)
        print(f"Error details: {str(e)}", file=sys.stderr)
        print(json.dumps(error_msg), file=sys.stderr)
        return 1

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: omf_parser.py <input_file>')
        sys.exit(1)
    sys.exit(parse_omf(sys.argv[1])) 