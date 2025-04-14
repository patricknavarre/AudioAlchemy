import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

const WaveformPlayer = ({ audioUrl, height = 100 }) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cleanup previous instance
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
      wavesurfer.current = null;
    }

    if (!audioUrl || !waveformRef.current) return;

    console.log("Loading audio URL:", audioUrl);
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      const options = {
        container: waveformRef.current,
        waveColor: "rgba(255, 255, 255, 0.3)",
        progressColor: "rgba(255, 255, 255, 0.8)",
        cursorColor: "rgba(255, 255, 255, 0.5)",
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height,
        normalize: true,
        url: audioUrl,
        fetchParams: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      };

      wavesurfer.current = WaveSurfer.create(options);

      wavesurfer.current.on("ready", () => {
        console.log("WaveSurfer ready");
        setLoading(false);
      });

      wavesurfer.current.on("error", (err) => {
        console.error("WaveSurfer error:", err);
        setError(err.message || "Error loading audio");
        setLoading(false);
      });

      // Listen for play/pause events
      wavesurfer.current.on("play", () => setIsPlaying(true));
      wavesurfer.current.on("pause", () => setIsPlaying(false));
      wavesurfer.current.on("finish", () => setIsPlaying(false));
    } catch (err) {
      console.error("WaveSurfer initialization error:", err);
      setError(err.message || "Error initializing audio player");
      setLoading(false);
    }

    return () => {
      if (wavesurfer.current) {
        try {
          wavesurfer.current.destroy();
        } catch (err) {
          console.error("Error destroying WaveSurfer:", err);
        }
        wavesurfer.current = null;
      }
    };
  }, [audioUrl, height]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  return (
    <div className="waveform-container">
      {loading && (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      <div
        ref={waveformRef}
        className="waveform"
        style={{ minHeight: height }}
      />
      {error ? (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      ) : (
        <button
          onClick={handlePlayPause}
          className="mt-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          disabled={loading}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      )}
    </div>
  );
};

export default WaveformPlayer;
