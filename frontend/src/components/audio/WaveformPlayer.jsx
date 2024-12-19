import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

export default function WaveformPlayer({ audioUrl, height = 128, waveColor = '#4a5568', progressColor = '#2b6cb0' }) {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      height,
      waveColor,
      progressColor,
      cursorColor: '#718096',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      responsive: true,
      normalize: true,
      backend: 'WebAudio',
      fetchParams: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    let isDestroyed = false;

    ws.on('ready', () => {
      if (!isDestroyed) {
        console.log('WaveSurfer ready');
        setLoading(false);
        setDuration(ws.getDuration());
        wavesurfer.current = ws;
      }
    });

    ws.on('error', err => {
      if (!isDestroyed) {
        console.error('WaveSurfer error:', err);
        setError('Error loading audio');
        setLoading(false);
      }
    });

    ws.on('audioprocess', () => {
      if (!isDestroyed && ws.isPlaying()) {
        setCurrentTime(ws.getCurrentTime());
      }
    });

    ws.on('play', () => !isDestroyed && setIsPlaying(true));
    ws.on('pause', () => !isDestroyed && setIsPlaying(false));
    ws.on('finish', () => !isDestroyed && setIsPlaying(false));

    console.log('Loading audio URL:', audioUrl);
    ws.load(audioUrl);

    return () => {
      isDestroyed = true;
      if (ws) {
        try {
          ws.destroy();
        } catch (err) {
          console.error('Error destroying WaveSurfer:', err);
        }
      }
    };
  }, [audioUrl, height, waveColor, progressColor]);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      {loading && (
        <div className="h-24 flex items-center justify-center">
          <p className="text-gray-500">Loading audio...</p>
        </div>
      )}
      
      {error && (
        <div className="h-24 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      
      <div ref={waveformRef} className="mb-4" />
      
      {!loading && !error && wavesurfer.current && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => wavesurfer.current.playPause()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="text-sm text-gray-600">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(time) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
} 