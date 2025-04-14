import numpy as np
import librosa
import soundfile as sf

def analyze_audio(file_path):
    try:
        # Load the audio file
        y, sr = librosa.load(file_path)
        
        # Compute spectral features using default parameters
        spec = np.abs(librosa.stft(y))
        spec_db = librosa.amplitude_to_db(spec, ref=np.max)
        
        # Calculate average spectral energy
        avg_energy = np.mean(spec_db)
        
        # Calculate tempo
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        
        # Calculate spectral centroid
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        avg_centroid = np.mean(spectral_centroids)
        
        return {
            "average_energy": float(avg_energy),
            "tempo": float(tempo),
            "spectral_centroid": float(avg_centroid)
        }
        
    except Exception as e:
        print(f"Error analyzing file: {str(e)}")
        return None 