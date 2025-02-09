import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import WaveSurfer from "wavesurfer.js";

const LoudnessMeter = ({ measurements, targetLUFS, onTargetChange }) => {
  return (
    <div className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10">
      <h3 className="font-medium text-white mb-2">Loudness Control</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-purple-200">Target LUFS:</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="-23"
              max="-14"
              step="0.5"
              value={targetLUFS}
              onChange={(e) => onTargetChange(parseFloat(e.target.value))}
              className="w-32"
            />
            <span className="text-purple-200 min-w-[4rem]">
              {targetLUFS} LUFS
            </span>
          </div>
        </div>

        {measurements && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-purple-200/70">Current Loudness:</span>
              <span className="text-purple-200">
                {measurements.integratedLoudness?.toFixed(1)} LUFS
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-200/70">Loudness Range:</span>
              <span className="text-purple-200">
                {measurements.loudnessRange?.toFixed(1)} LU
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-200/70">True Peak Max:</span>
              <span className="text-purple-200">
                {measurements.truePeakMax?.toFixed(1)} dBTP
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function ProjectMixer() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const waveformRefs = useRef({});
  const [mixSettings, setMixSettings] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const audioContext = useRef(null);
  const gainNodes = useRef({});
  const panNodes = useRef({});
  const [targetLUFS, setTargetLUFS] = useState(-23);
  const [loudnessMeasurements, setLoudnessMeasurements] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    // Initialize Web Audio API
    audioContext.current = new (window.AudioContext ||
      window.webkitAudioContext)();

    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/projects/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProject(response.data);
      setMixSettings(response.data.mixSettings);
      initializeWaveforms(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Error loading project");
    } finally {
      setLoading(false);
    }
  };

  const initializeWaveforms = (project) => {
    project.audioFiles.forEach((file) => {
      const wavesurfer = WaveSurfer.create({
        container: `#waveform-${file._id}`,
        waveColor: "#4a5568",
        progressColor: "#2b6cb0",
        height: 80,
        normalize: true,
        splitChannels: false,
        interact: false,
      });

      wavesurfer.load(
        `${import.meta.env.VITE_API_URL}/uploads/${file.fileName}`
      );
      waveformRefs.current[file._id] = wavesurfer;
    });
  };

  const handleVolumeChange = (trackId, value) => {
    setMixSettings((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.audioFileId === trackId
          ? { ...track, volume: parseFloat(value) }
          : track
      ),
    }));
  };

  const handlePanChange = (trackId, value) => {
    setMixSettings((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.audioFileId === trackId
          ? { ...track, pan: parseFloat(value) }
          : track
      ),
    }));
  };

  const toggleMute = (trackId) => {
    setMixSettings((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.audioFileId === trackId ? { ...track, mute: !track.mute } : track
      ),
    }));
  };

  const toggleSolo = (trackId) => {
    setMixSettings((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.audioFileId === trackId ? { ...track, solo: !track.solo } : track
      ),
    }));
  };

  const saveMixSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_URL}/projects/${id}/mix`,
        { mixSettings },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      setError("Failed to save mix settings");
    }
  };

  const initializeAudioNodes = (file) => {
    const gainNode = audioContext.current.createGain();
    const panNode = audioContext.current.createStereoPanner();

    gainNode.connect(panNode);
    panNode.connect(audioContext.current.destination);

    gainNodes.current[file._id] = gainNode;
    panNodes.current[file._id] = panNode;
  };

  const updateAudioNodes = (trackId, settings) => {
    if (gainNodes.current[trackId]) {
      // Convert dB to linear gain
      const gainValue = Math.pow(10, settings.volume / 20);
      gainNodes.current[trackId].gain.setValueAtTime(
        gainValue,
        audioContext.current.currentTime
      );
    }

    if (panNodes.current[trackId]) {
      panNodes.current[trackId].pan.setValueAtTime(
        settings.pan,
        audioContext.current.currentTime
      );
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      Object.values(waveformRefs.current).forEach((wavesurfer) => {
        wavesurfer.pause();
      });
    } else {
      Object.values(waveformRefs.current).forEach((wavesurfer) => {
        wavesurfer.play();
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleRender = async () => {
    try {
      setIsRendering(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/projects/${id}/render`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Start download
      window.location.href = `${
        import.meta.env.VITE_API_URL
      }/projects/${id}/download`;
    } catch (error) {
      console.error("Render error:", error);
      setError("Failed to render mix");
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    const measureLoudness = async () => {
      if (project?.mixedFile?.path) {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/projects/${
              project._id
            }/loudness`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          setLoudnessMeasurements(response.data);
        } catch (error) {
          console.error("Error measuring loudness:", error);
        }
      }
    };

    measureLoudness();
  }, [project?.mixedFile?.path]);

  const handleTargetLUFSChange = async (newTarget) => {
    setTargetLUFS(newTarget);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects/${project._id}/normalize`,
        { targetLUFS: newTarget },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      // Refresh the project to get the updated mix
      fetchProject();
    } catch (error) {
      console.error("Error normalizing loudness:", error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-gray-600">Status: {project.status}</p>
      </div>

      <div className="space-y-4">
        {project.audioFiles.map((file, index) => (
          <div key={file._id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">
                {file.trackName || `Track ${index + 1}`}
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => toggleMute(file._id)}
                  className={`px-2 py-1 rounded ${
                    mixSettings.tracks[index].mute
                      ? "bg-red-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => toggleSolo(file._id)}
                  className={`px-2 py-1 rounded ${
                    mixSettings.tracks[index].solo
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  S
                </button>
              </div>
            </div>

            <div id={`waveform-${file._id}`} className="mb-2" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm">Volume</label>
                <input
                  type="range"
                  min="-60"
                  max="12"
                  step="0.1"
                  value={mixSettings.tracks[index].volume}
                  onChange={(e) => handleVolumeChange(file._id, e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm">Pan</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={mixSettings.tracks[index].pan}
                  onChange={(e) => handlePanChange(file._id, e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={saveMixSettings}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save Mix
        </button>
      </div>

      <LoudnessMeter
        measurements={loudnessMeasurements}
        targetLUFS={targetLUFS}
        onTargetChange={handleTargetLUFSChange}
      />

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePlayPause}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <span>{formatTime(currentTime)}</span>
          </div>

          <button
            onClick={handleRender}
            disabled={isRendering}
            className={`px-4 py-2 rounded ${
              isRendering ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
            } text-white`}
          >
            {isRendering ? "Rendering..." : "Render Mix"}
          </button>
        </div>
      </div>
    </div>
  );
}
