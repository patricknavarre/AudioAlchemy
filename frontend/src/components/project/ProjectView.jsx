import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import WaveformPlayer from "../audio/WaveformPlayer";
import { toast } from "react-hot-toast";
import { FiVolume2, FiRefreshCw, FiDownload } from "react-icons/fi";
import { debounce } from "lodash";

// Utility function to get filename from path
const getFilename = (filepath) => {
  if (!filepath) return "";
  const parts = filepath.split("/");
  return parts[parts.length - 1];
};

export default function ProjectView() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(location.state?.project || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mixing, setMixing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [processingDetails, setProcessingDetails] = useState(null);
  const [expandedFile, setExpandedFile] = useState(null);
  const [stemVolumes, setStemVolumes] = useState({});
  const [isRemixing, setIsRemixing] = useState(false);
  const [targetLUFS, setTargetLUFS] = useState(-23);
  const [loudnessMeasurements, setLoudnessMeasurements] = useState(null);
  const [gainAdjustment, setGainAdjustment] = useState(0);
  const [isCheckingLoudness, setIsCheckingLoudness] = useState(false);

  // Single useEffect to handle project fetching and URL initialization
  useEffect(() => {
    const initializeProject = async () => {
      try {
        if (!id) {
          console.log("No project ID provided, redirecting to projects list");
          navigate("/projects");
          return;
        }

        // Always fetch fresh project data
        console.log("Fetching project with ID:", id);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/projects/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        console.log("Project data received:", response.data);
        const projectData = response.data;
        setProject(projectData);

        // Initialize audio URLs
        if (projectData.mixedFile?.path) {
          const fileName = getFilename(projectData.mixedFile.path);
          console.log("Setting mixed file URL for:", fileName);
          setAudioUrl(
            `${import.meta.env.VITE_API_URL}/api/projects/mixed/${fileName}`
          );
        }

        if (projectData.files?.length > 0) {
          const files = projectData.files.map((file) => {
            if (!file.processedPath) {
              console.warn("File missing processedPath:", file);
              return { ...file, audioUrl: null };
            }
            const fileName = getFilename(file.processedPath);
            console.log("Setting processed file URL for:", fileName);
            return {
              ...file,
              audioUrl: `${
                import.meta.env.VITE_API_URL
              }/api/projects/processed/${fileName}`,
            };
          });
          setProcessedFiles(files);
        }
      } catch (err) {
        console.error("Project initialization error:", err);
        setError(err.response?.data?.message || "Error loading project");
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      initializeProject();
    }
  }, [id, navigate]);

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

  const handleMix = async () => {
    try {
      setMixing(true);
      setProcessingDetails(null);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects/${id}/mix`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Mix response:", response.data);

      if (response.data.processingDetails) {
        setProcessingDetails(response.data.processingDetails);
      }

      // Wait a moment for the mix to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch the updated project data
      const updatedProjectResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Updated project data:", updatedProjectResponse.data);
      const projectData = updatedProjectResponse.data;
      setProject(projectData);

      // Update audio URLs
      if (projectData.mixedFile?.path) {
        const fileName = getFilename(projectData.mixedFile.path);
        console.log("Setting mixed file URL for:", fileName);
        setAudioUrl(
          `${import.meta.env.VITE_API_URL}/api/projects/mixed/${fileName}`
        );
      }

      if (projectData.files?.length > 0) {
        const files = projectData.files.map((file) => {
          if (!file.processedPath) {
            console.warn("File missing processedPath:", file);
            return { ...file, audioUrl: null };
          }
          const fileName = getFilename(file.processedPath);
          console.log("Setting processed file URL for:", fileName);
          return {
            ...file,
            audioUrl: `${
              import.meta.env.VITE_API_URL
            }/api/projects/processed/${fileName}`,
          };
        });
        setProcessedFiles(files);
      }

      toast.success("Mix created successfully!");
    } catch (err) {
      console.error("Mix error:", err);
      setError(err.response?.data?.message || "Error mixing project");
      toast.error("Failed to create mix");
    } finally {
      setMixing(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!project.mixedFile?.path) {
        throw new Error("No mixed file available");
      }

      const fileName = getFilename(project.mixedFile.path);
      console.log("Downloading mix:", {
        fileName,
        url: `${import.meta.env.VITE_API_URL}/api/projects/mixed/${fileName}`,
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/mixed/${fileName}`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to download mix");
      toast.error("Failed to download mix");
    }
  };

  const handleVolumeChange = (fileId, volume) => {
    setStemVolumes((prev) => ({
      ...prev,
      [fileId]: parseFloat(volume),
    }));
  };

  const handleCheckLoudness = async () => {
    setIsCheckingLoudness(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/${project._id}/loudness`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setLoudnessMeasurements(response.data);
    } catch (error) {
      console.error("Error measuring loudness:", error);
      toast.error("Failed to measure loudness");
    } finally {
      setIsCheckingLoudness(false);
    }
  };

  const handleRemix = async () => {
    try {
      setIsRemixing(true);
      setProcessingDetails(null);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects/${id}/remix`,
        {
          stemVolumes,
          gainAdjustment: parseFloat(gainAdjustment),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Remix response:", response.data);

      if (response.data.processingDetails) {
        setProcessingDetails(response.data.processingDetails);
      }

      // Wait a moment for the mix to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch the updated project data
      const updatedProjectResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Updated project data:", updatedProjectResponse.data);
      const projectData = updatedProjectResponse.data;
      setProject(projectData);

      // Update audio URLs
      if (projectData.mixedFile?.path) {
        const fileName = getFilename(projectData.mixedFile.path);
        console.log("Setting mixed file URL for:", fileName);
        setAudioUrl(
          `${import.meta.env.VITE_API_URL}/api/projects/mixed/${fileName}`
        );
      }

      toast.success("Mix updated successfully!");
    } catch (err) {
      console.error("Remix error:", err);
      setError(err.response?.data?.message || "Error updating mix");
      toast.error("Failed to update mix");
    } finally {
      setIsRemixing(false);
    }
  };

  const handleTargetLUFSChange = async (newTarget) => {
    setTargetLUFS(newTarget);
    try {
      setMixing(true);
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects/${project._id}/normalize`,
        { targetLUFS: newTarget },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      // Fetch the updated project to get the new mix
      const updatedProjectResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/${project._id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setProject(updatedProjectResponse.data);

      // Update audio URLs
      if (updatedProjectResponse.data.mixedFile?.path) {
        const fileName = getFilename(
          updatedProjectResponse.data.mixedFile.path
        );
        setAudioUrl(
          `${import.meta.env.VITE_API_URL}/api/projects/mixed/${fileName}`
        );
      }
      toast.success("Mix normalized successfully");
    } catch (error) {
      console.error("Error normalizing loudness:", error);
      toast.error("Failed to normalize mix");
    } finally {
      setMixing(false);
    }
  };

  const handleStemDownload = async (file) => {
    try {
      if (!file.processedPath) {
        throw new Error("No processed file available");
      }

      const fileName = getFilename(file.processedPath);
      console.log("Downloading stem:", {
        fileName,
        url: `${
          import.meta.env.VITE_API_URL
        }/api/projects/processed/${fileName}`,
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/processed/${fileName}`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded ${file.stemType} stem`);
    } catch (err) {
      console.error("Stem download error:", err);
      toast.error("Failed to download stem");
    }
  };

  const renderProcessingDetails = () => {
    if (!processingDetails?.files) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">
          Processing Details
        </h2>
        <div className="space-y-4">
          {processingDetails.files.map((file, index) => (
            <div
              key={index}
              className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10"
            >
              <h3 className="font-medium text-white mb-2">
                {file.name} ({file.stemType})
              </h3>
              <div className="space-y-2">
                {file.analysis && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {file.analysis.issues && (
                      <div className="col-span-2">
                        <h4 className="text-purple-200 mb-1">
                          Issues Detected & Fixed:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(file.analysis.issues)
                            .filter(([_, value]) => value)
                            .map(([issue]) => (
                              <span
                                key={issue}
                                className="px-2 py-1 rounded-full bg-white/10 text-purple-200 text-xs"
                              >
                                {issue.replace(/([A-Z])/g, " $1").toLowerCase()}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    {file.analysis.frequency && (
                      <>
                        <div>
                          <h4 className="text-purple-200 mb-1">
                            Frequency Analysis:
                          </h4>
                          <ul className="list-disc list-inside text-purple-200/70">
                            {Object.entries(
                              file.analysis.frequency.bands || {}
                            ).map(([band, data]) => (
                              <li key={band}>
                                {band}: {data?.energy?.toFixed(2) || 0} energy
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-purple-200 mb-1">Dynamics:</h4>
                          <ul className="list-disc list-inside text-purple-200/70">
                            <li>
                              Crest Factor:{" "}
                              {file.analysis.dynamics?.crestFactor?.toFixed(
                                1
                              ) || 0}
                            </li>
                            <li>
                              Stereo Width:{" "}
                              {(file.analysis.stereo?.width_ratio || 0).toFixed(
                                2
                              )}
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {file.processing?.filters && (
                  <div>
                    <h4 className="text-purple-200 mb-1">
                      Processing Applied:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {file.processing.filters.map((filter, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs"
                        >
                          {filter.filter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {processingDetails.mixingDetails && (
            <div className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10">
              <h3 className="font-medium text-white mb-2">Final Mix Details</h3>
              <div className="text-sm text-purple-200/70">
                <p>
                  Mixed {processingDetails.files?.length || 0} stems using{" "}
                  {processingDetails.mixingDetails.method}
                </p>
                <p>Output Format: {processingDetails.mixingDetails.format}</p>
                <p>
                  Sample Rate: {processingDetails.mixingDetails.sampleRate}Hz
                </p>
                <p>Bit Depth: {processingDetails.mixingDetails.bitDepth}-bit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AudioPlayer = ({ url }) => (
    <div className="mt-4 bg-white/5 rounded-xl p-3 backdrop-blur-sm">
      <audio
        controls
        src={url}
        className="w-full"
        preload="metadata"
        onError={(e) => console.error("Audio element error:", e)}
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );

  const ProcessingInfo = ({ file }) => {
    if (!file.processing && !file.analysis) return null;

    return (
      <div className="mt-4 pt-4 border-t border-white/10">
        {file.analysis?.issues && (
          <div className="mb-3">
            <h4 className="text-purple-200 text-sm font-medium mb-2">
              Issues Detected & Fixed:
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(file.analysis.issues)
                .filter(([_, value]) => value)
                .map(([issue]) => (
                  <span
                    key={issue}
                    className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs"
                  >
                    {issue.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {file.analysis?.frequency && (
            <div>
              <h4 className="text-purple-200 text-sm font-medium mb-2">
                Frequency Analysis:
              </h4>
              <ul className="list-disc list-inside text-purple-200/70 text-sm">
                {Object.entries(file.analysis.frequency.bands || {}).map(
                  ([band, data]) => (
                    <li key={band}>
                      {band}: {data?.energy?.toFixed(2) || 0} energy
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {(file.analysis?.dynamics || file.analysis?.stereo) && (
            <div>
              <h4 className="text-purple-200 text-sm font-medium mb-2">
                Dynamics & Stereo:
              </h4>
              <ul className="list-disc list-inside text-purple-200/70 text-sm">
                {file.analysis?.dynamics?.crestFactor && (
                  <li>
                    Crest Factor:{" "}
                    {file.analysis.dynamics.crestFactor.toFixed(1)}
                  </li>
                )}
                {file.analysis?.stereo?.width_ratio && (
                  <li>
                    Stereo Width: {file.analysis.stereo.width_ratio.toFixed(2)}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {file.processing?.filters && file.processing.filters.length > 0 && (
          <div className="mt-3">
            <h4 className="text-purple-200 text-sm font-medium mb-2">
              Processing Applied:
            </h4>
            <div className="flex flex-wrap gap-2">
              {file.processing.filters.map((filter, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs"
                >
                  {filter.filter}
                </span>
              ))}
            </div>
          </div>
        )}

        {file.processing?.improvements && (
          <div className="mt-3">
            <h4 className="text-purple-200 text-sm font-medium mb-2">
              Improvements Made:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-purple-200/70">
              {Object.entries(file.processing.improvements).map(
                ([key, value]) => (
                  <div key={key}>
                    <span className="font-medium">{key}:</span> {value}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const LoudnessMeter = ({ measurements, onCheckLoudness }) => {
    const handleGainChange = (e) => {
      const value = parseFloat(e.target.value);
      setGainAdjustment(value);
    };

    return (
      <div className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white">Loudness Control</h3>
          <button
            onClick={onCheckLoudness}
            disabled={isCheckingLoudness}
            className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors"
          >
            {isCheckingLoudness ? "Checking..." : "Check Loudness"}
          </button>
        </div>

        <div className="space-y-4">
          {measurements && (
            <div className="grid grid-cols-1 gap-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-purple-200/70">Integrated Loudness:</span>
                <span className="text-purple-200 font-medium">
                  {measurements.integratedLoudness?.toFixed(1)} LUFS
                </span>
              </div>
              {measurements.loudnessRange && (
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/70">Loudness Range:</span>
                  <span className="text-purple-200 font-medium">
                    {measurements.loudnessRange.toFixed(1)} LU
                  </span>
                </div>
              )}
              {measurements.truePeakMax && (
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/70">True Peak Maximum:</span>
                  <span className="text-purple-200 font-medium">
                    {measurements.truePeakMax.toFixed(1)} dBTP
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-purple-200">Gain Adjustment:</span>
              <span className="text-purple-200">
                {gainAdjustment > 0 ? "+" : ""}
                {gainAdjustment} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.1"
              value={gainAdjustment}
              onChange={handleGainChange}
              className="w-full h-2 bg-purple-200/20 rounded-lg appearance-none cursor-pointer hover:bg-purple-200/30 transition-all duration-200
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:hover:bg-purple-300 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:shadow-md
                [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-400 [&::-moz-range-thumb]:hover:bg-purple-300 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-0"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-4 py-8">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-3 text-white">
            <svg
              className="animate-spin h-8 w-8"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-xl font-medium">Loading project...</span>
          </div>
        </div>
      ) : error ? (
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="mb-4 p-3 bg-red-900/30 border-l-4 border-red-500 text-red-200">
              {error}
            </div>
          </div>
        </div>
      ) : !project ? (
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <p className="text-white text-center">Project not found</p>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                {project.name}
              </h1>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-purple-200 text-sm">
                  {project.mixStyle}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Stems</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {project.files?.map((file, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10"
                  >
                    <p className="font-medium text-white mb-1">
                      {file.stemType}
                    </p>
                    <p className="text-sm text-purple-200">
                      {file.originalPath?.split("/").pop()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Processed Files
              </h2>
              <div className="space-y-6">
                {processedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-white">{file.stemType}</p>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleStemDownload(file)}
                          className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-sm transition-colors flex items-center space-x-2"
                        >
                          <FiDownload className="w-4 h-4" />
                          <span>Download Stem</span>
                        </button>
                        <button
                          onClick={() =>
                            setExpandedFile(
                              expandedFile === index ? null : index
                            )
                          }
                          className="text-purple-200 hover:text-white transition-colors"
                        >
                          {expandedFile === index
                            ? "Hide Details"
                            : "Show Details"}
                        </button>
                      </div>
                    </div>
                    <WaveformPlayer audioUrl={file.audioUrl} height={80} />
                    <div className="mt-4 flex items-center space-x-4">
                      <FiVolume2 className="text-purple-200" />
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={stemVolumes[file._id] || 1}
                        onChange={(e) =>
                          handleVolumeChange(file._id, e.target.value)
                        }
                        className="w-full h-2 bg-purple-200/20 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-purple-200 min-w-[3rem]">
                        {(stemVolumes[file._id] || 1).toFixed(1)}x
                      </span>
                    </div>
                    {expandedFile === index && <ProcessingInfo file={file} />}
                  </div>
                ))}
              </div>
            </div>

            {processingDetails && renderProcessingDetails()}

            {project.mixedFile ? (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Final Mix
                </h2>
                {audioUrl && (
                  <>
                    <div className="p-6 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 mb-4">
                      <WaveformPlayer audioUrl={audioUrl} height={120} />
                    </div>

                    <LoudnessMeter
                      measurements={loudnessMeasurements}
                      onCheckLoudness={handleCheckLoudness}
                    />

                    <div className="flex gap-4">
                      <button
                        onClick={handleRemix}
                        disabled={isRemixing}
                        className={`flex-1 p-4 rounded-xl font-medium transition-all duration-200
                          ${
                            isRemixing
                              ? "bg-gray-600 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white hover:shadow-lg hover:-translate-y-0.5"
                          }`}
                      >
                        {isRemixing ? (
                          <div className="flex items-center justify-center space-x-3">
                            <FiRefreshCw className="animate-spin" />
                            <span>Updating Mix...</span>
                          </div>
                        ) : (
                          "Update Mix"
                        )}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex-1 p-4 rounded-xl font-medium transition-all duration-200
                          bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 
                          hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
                      >
                        Download Mix
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleMix}
                disabled={mixing}
                className={`w-full p-4 rounded-xl font-medium transition-all duration-200
                  ${
                    mixing
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
                  }`}
              >
                {mixing ? (
                  <div className="flex items-center justify-center space-x-3">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Creating Mix...</span>
                  </div>
                ) : (
                  "Create Mix"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
