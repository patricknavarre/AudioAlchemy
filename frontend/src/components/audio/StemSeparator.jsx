import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiUpload,
  FiMusic,
  FiMic,
  FiHeadphones,
  FiLoader,
  FiPlay,
  FiPause,
  FiDownload,
} from "react-icons/fi";
import WaveSurfer from "wavesurfer.js";

export default function StemSeparator() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [separatedStems, setSeparatedStems] = useState(null);
  const navigate = useNavigate();

  // Wavesurfer instances
  const vocalsWaveformRef = useRef(null);
  const accompWaveformRef = useRef(null);
  const [isPlayingVocals, setIsPlayingVocals] = useState(false);
  const [isPlayingAccomp, setIsPlayingAccomp] = useState(false);
  const [vocalsWavesurfer, setVocalsWavesurfer] = useState(null);
  const [accompWavesurfer, setAccompWavesurfer] = useState(null);

  // Initialize waveform instances when stems are ready
  useEffect(() => {
    if (
      separatedStems &&
      vocalsWaveformRef.current &&
      accompWaveformRef.current
    ) {
      // Initialize vocals waveform
      const vocalsWS = WaveSurfer.create({
        container: vocalsWaveformRef.current,
        waveColor: "#e9d5ff",
        progressColor: "#a855f7",
        cursorColor: "#f0abfc",
        barWidth: 2,
        barGap: 1,
        height: 60,
        normalize: true,
        responsive: true,
        fillParent: true,
      });

      // Initialize accompaniment waveform
      const accompWS = WaveSurfer.create({
        container: accompWaveformRef.current,
        waveColor: "#e9d5ff",
        progressColor: "#a855f7",
        cursorColor: "#f0abfc",
        barWidth: 2,
        barGap: 1,
        height: 60,
        normalize: true,
        responsive: true,
        fillParent: true,
      });

      // Load audio files with authorization header
      const vocalsUrl = `${import.meta.env.VITE_API_URL}${
        separatedStems.vocals
      }`;
      const accompUrl = `${import.meta.env.VITE_API_URL}${
        separatedStems.accompaniment
      }`;

      console.log("Loading waveforms:", { vocalsUrl, accompUrl });

      // Function to load vocals
      const loadVocals = async () => {
        try {
          const response = await fetch(vocalsUrl, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
          const blob = await response.blob();
          vocalsWS.loadBlob(blob);
        } catch (error) {
          console.error("Error loading vocals:", error);
          toast.error("Error loading vocals waveform");
        }
      };

      // Function to load accompaniment
      const loadAccomp = async () => {
        try {
          const response = await fetch(accompUrl, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
          const blob = await response.blob();
          accompWS.loadBlob(blob);
        } catch (error) {
          console.error("Error loading accompaniment:", error);
          toast.error("Error loading accompaniment waveform");
        }
      };

      // Load both stems
      loadVocals();
      loadAccomp();

      // Add event listeners
      vocalsWS.on("finish", () => setIsPlayingVocals(false));
      accompWS.on("finish", () => setIsPlayingAccomp(false));

      // Add error event listeners
      vocalsWS.on("error", (error) => {
        console.error("Vocals waveform error:", error);
        toast.error("Error initializing vocals waveform");
      });

      accompWS.on("error", (error) => {
        console.error("Accompaniment waveform error:", error);
        toast.error("Error initializing accompaniment waveform");
      });

      setVocalsWavesurfer(vocalsWS);
      setAccompWavesurfer(accompWS);

      // Cleanup
      return () => {
        vocalsWS.destroy();
        accompWS.destroy();
      };
    }
  }, [separatedStems]);

  const handlePlayPauseVocals = () => {
    if (vocalsWavesurfer) {
      vocalsWavesurfer.playPause();
      setIsPlayingVocals(!isPlayingVocals);
    }
  };

  const handlePlayPauseAccomp = () => {
    if (accompWavesurfer) {
      accompWavesurfer.playPause();
      setIsPlayingAccomp(!isPlayingAccomp);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error("File size must be less than 100MB");
        return;
      }
      if (!selectedFile.type.startsWith("audio/")) {
        toast.error("Please select an audio file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSeparation = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("audio", file);

    try {
      toast.loading("Separating stems... This may take a few minutes", {
        duration: Infinity,
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/stems/separate`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        }
      );

      toast.dismiss();
      setSeparatedStems(response.data.stems);
      toast.success("Stems separated successfully!");
    } catch (error) {
      toast.dismiss();
      console.error("Separation error:", error);
      toast.error(
        error.response?.data?.message ||
          "Error processing audio. Please try a different file or try again later."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadStem = async (stemUrl, stemName) => {
    try {
      toast.loading("Downloading stem...");
      // Add .wav extension if not present
      const url = `${import.meta.env.VITE_API_URL}${stemUrl}${
        stemUrl.endsWith(".wav") ? "" : ".wav"
      }`;
      console.log("Downloading stem:", { url, stemName });

      const response = await axios.get(url, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.data) {
        throw new Error("No data received");
      }

      const blob = new Blob([response.data], { type: "audio/wav" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `${stemName}.wav`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.dismiss();
      toast.success(`${stemName} stem downloaded successfully!`);
    } catch (error) {
      toast.dismiss();
      console.error("Download error:", error);
      toast.error("Error downloading stem");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            AI Stem Separator
          </h1>
          <p className="text-xl text-purple-200">
            Upload your audio and let AI separate it into vocals and
            accompaniment
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-xl">
          {!separatedStems ? (
            <div className="space-y-8">
              <div className="flex justify-center">
                <label className="w-full max-w-lg flex flex-col items-center px-4 py-6 border-2 border-purple-300 border-dashed rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
                  <FiUpload className="w-12 h-12 text-purple-300" />
                  <span className="mt-2 text-base text-purple-200">
                    {file ? file.name : "Select an audio file"}
                  </span>
                  <span className="mt-1 text-sm text-purple-300">
                    MP3, WAV, or AIFF up to 100MB
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="audio/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <button
                onClick={handleSeparation}
                disabled={!file || isProcessing}
                className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-all duration-200 ${
                  !file || isProcessing
                    ? "bg-purple-500/50 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-3">
                    <FiLoader className="animate-spin" />
                    <span>Processing... {progress}%</span>
                  </div>
                ) : (
                  "Separate Stems"
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Separated Stems
              </h2>
              <div className="space-y-6">
                {/* Vocals Stem */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FiMic className="w-6 h-6 text-purple-300" />
                      <span className="text-lg font-medium text-white">
                        Vocals
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handlePlayPauseVocals}
                        className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors"
                      >
                        {isPlayingVocals ? <FiPause /> : <FiPlay />}
                      </button>
                      <button
                        onClick={() =>
                          downloadStem(separatedStems.vocals, "vocals")
                        }
                        className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors"
                      >
                        <FiDownload />
                      </button>
                    </div>
                  </div>
                  <div
                    ref={vocalsWaveformRef}
                    className="w-full rounded-lg overflow-hidden"
                  />
                </div>

                {/* Accompaniment Stem */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FiMusic className="w-6 h-6 text-purple-300" />
                      <span className="text-lg font-medium text-white">
                        Accompaniment
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handlePlayPauseAccomp}
                        className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors"
                      >
                        {isPlayingAccomp ? <FiPause /> : <FiPlay />}
                      </button>
                      <button
                        onClick={() =>
                          downloadStem(
                            separatedStems.accompaniment,
                            "accompaniment"
                          )
                        }
                        className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors"
                      >
                        <FiDownload />
                      </button>
                    </div>
                  </div>
                  <div
                    ref={accompWaveformRef}
                    className="w-full rounded-lg overflow-hidden"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setFile(null);
                  setSeparatedStems(null);
                  setProgress(0);
                  setIsPlayingVocals(false);
                  setIsPlayingAccomp(false);
                }}
                className="w-full mt-6 py-3 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-purple-200 transition-colors"
              >
                Process Another File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
