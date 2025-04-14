#!/usr/bin/env python3
import sys
import json
import os
import numpy as np
import librosa
import soundfile as sf

def analyze_audio(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    # Load the audio file
    y, sr = librosa.load(file_path, sr=None)
    
    # Get duration
    duration = librosa.get_duration(y=y, sr=sr)
    
    # Compute spectral features
    window_length = 2048
    spec = np.abs(librosa.stft(y, n_fft=window_length))
    spec_db = librosa.amplitude_to_db(spec, ref=np.max)
    
    # Frequency band analysis
    bands = {
        'sub': (20, 60),
        'bass': (60, 250),
        'lowMids': (250, 500),
        'mids': (500, 2000),
        'presence': (2000, 4000),
        'highs': (4000, 20000)
    }
    
    band_energies = {}
    for band_name, (low, high) in bands.items():
        freqs = librosa.fft_frequencies(sr=sr, n_fft=window_length)
        mask = (freqs >= low) & (freqs <= high)
        band_spec = spec[mask]
        energy = np.mean(np.abs(band_spec))
        band_energies[band_name] = {
            'energy': float(energy),
            'peak_freq': float(freqs[mask][np.argmax(np.mean(spec[mask], axis=1))])
        }
    
    # Compute spectral centroid and flatness
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    flatness = librosa.feature.spectral_flatness(y=y)
    
    # Compute dynamics
    rms = librosa.feature.rms(y=y)
    peak = np.max(np.abs(y))
    crest_factor = peak / (np.mean(rms) + 1e-8)
    
    # Stereo analysis (if stereo)
    if len(y.shape) > 1 and y.shape[1] == 2:
        left, right = y[:, 0], y[:, 1]
        correlation = np.corrcoef(left, right)[0, 1]
        width_ratio = np.std(left - right) / (np.std(left + right) + 1e-8)
    else:
        correlation = 1.0
        width_ratio = 1.0
    
    # Rhythm analysis
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
    onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
    transient_density = len(onset_frames) / (duration + 1e-8)
    
    # Detect issues
    issues = {
        'muddy': float(band_energies['lowMids']['energy']) > 3.0 * float(band_energies['presence']['energy']),
        'harsh': float(band_energies['presence']['energy']) > 2.0 * float(band_energies['mids']['energy']),
        'phaseCancellation': correlation < 0.2,
        'excessiveStereoWidth': width_ratio > 2.5,
        'clipping': peak > 0.99
    }
    
    return {
        'issues': issues,
        'frequency': {
            'bands': band_energies,
            'spectralFeatures': {
                'flatness': float(np.mean(flatness)),
                'centroid': float(np.mean(centroid))
            }
        },
        'dynamics': {
            'crestFactor': float(crest_factor),
            'peakLevel': float(peak),
            'rmsLevel': float(np.mean(rms))
        },
        'stereo': {
            'correlation': float(correlation),
            'width_ratio': float(width_ratio)
        },
        'rhythm': {
            'tempo': float(tempo),
            'transientDensity': float(transient_density)
        },
        'info': {
            'duration': float(duration),
            'sampleRate': int(sr),
            'channels': 2 if len(y.shape) > 1 else 1
        }
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python audio_analyzer.py <audio_file>", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        analysis = analyze_audio(file_path)
        print(json.dumps(analysis))
    except Exception as e:
        print(f"Error analyzing file: {str(e)}", file=sys.stderr)
        sys.exit(1) 