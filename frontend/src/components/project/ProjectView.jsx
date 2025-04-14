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
  const [truePeakLimit, setTruePeakLimit] = useState(-1.0);
  const [loudnessMeasurements, setLoudnessMeasurements] = useState(null);
  const [gainAdjustment, setGainAdjustment] = useState(0);
  const [isCheckingLoudness, setIsCheckingLoudness] = useState(false);
  const [isAdjustingTruePeak, setIsAdjustingTruePeak] = useState(false);
  const [advancedControlsOpen, setAdvancedControlsOpen] = useState(false);
  const [showMixCreatedHighlight, setShowMixCreatedHighlight] = useState(false);

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
        
        // Debug processing data
        console.log("Processing details:", response.data.processingDetails);
        console.log("Files with analysis:", response.data.files.map(file => ({
          stemType: file.stemType,
          hasProcessing: !!file.processing,
          hasAnalysis: !!file.analysis,
          processingKeys: file.processing ? Object.keys(file.processing) : [],
          analysisKeys: file.analysis ? Object.keys(file.analysis) : []
        })));
        
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
          
          // Show details for all stems by default
          setExpandedFile('all');
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
        
        // Show highlight animation for newly created mix
        setShowMixCreatedHighlight(true);
        // Auto-scroll to the mix section
        setTimeout(() => {
          document.getElementById('final-mix-section')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
          // Remove highlight after 5 seconds
          setTimeout(() => setShowMixCreatedHighlight(false), 5000);
        }, 500);
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
    } catch (error) {
      console.error("Mix error:", error);
      toast.error(error.response?.data?.message || "Error creating mix");
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

  const handleTruePeakAdjustment = async () => {
    try {
      setIsAdjustingTruePeak(true);
      
      console.log(`Adjusting True Peak to ${truePeakLimit} dB`);
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects/${id}/adjust-true-peak`,
        { truePeakLimit },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      console.log("True Peak adjustment response:", response.data);
      
      if (response.data.processingDetails) {
        setProcessingDetails(response.data.processingDetails);
      }
      
      // Wait a moment for the processing to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Fetch the updated project data with the adjusted audio
      const updatedProjectResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      console.log("Updated project data after True Peak adjustment:", updatedProjectResponse.data);
      const projectData = updatedProjectResponse.data;
      setProject(projectData);
      
      // Update audio URL
      if (projectData.mixedFile?.path) {
        const fileName = getFilename(projectData.mixedFile.path);
        console.log("Setting mixed file URL for:", fileName);
        setAudioUrl(
          `${import.meta.env.VITE_API_URL}/api/projects/mixed/${fileName}`
        );
      }
      
      toast.success("True Peak adjustment completed successfully");
    } catch (error) {
      console.error("Error adjusting True Peak:", error);
      toast.error(error.response?.data?.message || "Error adjusting True Peak");
    } finally {
      setIsAdjustingTruePeak(false);
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
                      <div>
                        <h4 className="text-purple-200 mb-1">
                          Frequency Profile:
                        </h4>
                        <div className="text-xs text-purple-200/70">
                          {Object.entries(file.analysis.frequency.bands || {})
                            .filter(([_, data]) => data.energy > 0.1)
                            .map(([band, data]) => (
                              <div key={band} className="mb-1">
                                <div className="flex justify-between">
                                  <span>{band.replace(/([A-Z])/g, " $1").toLowerCase()}:</span>
                                  <span>{data.energy.toFixed(2)}</span>
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-purple-500/50 h-full" 
                                    style={{ width: `${Math.min(100, data.energy * 25)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    {(file.analysis.dynamics || file.analysis.stereo) && (
                      <div>
                        <h4 className="text-purple-200 mb-1">
                          Technical Metrics:
                        </h4>
                        <div className="text-xs grid grid-cols-2 gap-x-2 text-purple-200/70">
                          {file.analysis.dynamics?.crestFactor && (
                            <div className="flex justify-between">
                              <span>Dynamics:</span>
                              <span>{file.analysis.dynamics.crestFactor.toFixed(1)}</span>
                            </div>
                          )}
                          {file.analysis.dynamics?.peakLevel && (
                            <div className="flex justify-between">
                              <span>Peak:</span>
                              <span>{file.analysis.dynamics.peakLevel.toFixed(1)} dB</span>
                            </div>
                          )}
                          {file.analysis.stereo?.correlation && (
                            <div className="flex justify-between">
                              <span>Stereo Corr:</span>
                              <span>{file.analysis.stereo.correlation.toFixed(2)}</span>
                            </div>
                          )}
                          {file.analysis.stereo?.width_ratio && (
                            <div className="flex justify-between">
                              <span>Width:</span>
                              <span>{file.analysis.stereo.width_ratio.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
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
                          {filter.description && `: ${filter.description}`}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm text-purple-200/70">
                  <p>
                    <span className="text-purple-200">Method:</span> {processingDetails.mixingDetails.method}
                  </p>
                  <p>
                    <span className="text-purple-200">Format:</span> {processingDetails.mixingDetails.format}
                  </p>
                  <p>
                    <span className="text-purple-200">Sample Rate:</span> {processingDetails.mixingDetails.sampleRate}Hz
                  </p>
                  <p>
                    <span className="text-purple-200">Bit Depth:</span> {processingDetails.mixingDetails.bitDepth}-bit
                  </p>
                </div>
                <div className="text-sm text-purple-200/70">
                  <p>
                    <span className="text-purple-200">Mix Process:</span> {processingDetails.files?.length || 0} stems combined
                  </p>
                  <p>
                    <span className="text-purple-200">Channels:</span> {processingDetails.mixingDetails.channels || 2}
                  </p>
                  {processingDetails.loudness && (
                    <>
                      <p>
                        <span className="text-purple-200">Target Loudness:</span> {processingDetails.loudness.target || -23} LUFS
                      </p>
                      <p>
                        <span className="text-purple-200">Actual Loudness:</span> {processingDetails.loudness.integrated?.toFixed(1) || "N/A"} LUFS
                      </p>
                    </>
                  )}
                </div>
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
    console.log("ProcessingInfo component received file:", file);
    
    // Ensure file has processing or analysis data
    if (!file || (!file.processing && !file.analysis)) {
      console.log("No processing or analysis data found for file");
      return <div className="mt-4 pt-4 border-t border-white/10 text-purple-200 text-sm">No processing data available</div>;
    }

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
                      {band.replace(/([A-Z])/g, " $1").toLowerCase()}: {data?.energy?.toFixed(2) || 0} energy
                      {data?.peak_freq && ` (peak: ${Math.round(data.peak_freq)} Hz)`}
                    </li>
                  )
                )}
                {file.analysis.frequency.spectralFeatures?.flatness && (
                  <li>
                    Spectral Flatness: {file.analysis.frequency.spectralFeatures.flatness.toFixed(3)}
                  </li>
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
                {file.analysis?.dynamics?.peakLevel && (
                  <li>
                    Peak Level: {file.analysis.dynamics.peakLevel.toFixed(1)} dB
                  </li>
                )}
                {file.analysis?.dynamics?.rmsLevel && (
                  <li>
                    RMS Level: {file.analysis.dynamics.rmsLevel.toFixed(1)} dB
                  </li>
                )}
                {file.analysis?.stereo?.correlation && (
                  <li>
                    Stereo Correlation: {file.analysis.stereo.correlation.toFixed(2)}
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

        {file.analysis?.rhythm && (
          <div className="mt-3">
            <h4 className="text-purple-200 text-sm font-medium mb-2">
              Rhythm Analysis:
            </h4>
            <ul className="list-disc list-inside text-purple-200/70 text-sm">
              {file.analysis.rhythm.tempo && (
                <li>Tempo: {Math.round(file.analysis.rhythm.tempo)} BPM</li>
              )}
              {file.analysis.rhythm.transientDensity && (
                <li>
                  Transient Density: {file.analysis.rhythm.transientDensity.toFixed(2)}
                </li>
              )}
            </ul>
          </div>
        )}

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
                  {filter.description && `: ${filter.description}`}
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

        {file.processingDetails?.filters && (
          <div className="mt-3">
            <h4 className="text-purple-200 text-sm font-medium mb-2">
              Audio Processing Chain:
            </h4>
            <ul className="list-disc list-inside text-purple-200/70 text-sm">
              {file.processingDetails.filters.map((filter, i) => (
                <li key={i}>
                  {filter.type}
                  {filter.settings && `: ${JSON.stringify(filter.settings)}`}
                </li>
              ))}
            </ul>
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

  const TruePeakControls = () => {
    // Handle True Peak limit slider change
    const handleTruePeakChange = (e) => {
      setTruePeakLimit(parseFloat(e.target.value));
    };
    
    // True Peak values are typically between -0.1 and -6.0 dB for broadcast
    return (
      <div className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 mt-4">
        <h3 className="font-medium text-white mb-4">True Peak Control</h3>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-purple-200">True Peak Limit:</span>
            <span className="text-purple-200 font-medium">
              {truePeakLimit.toFixed(1)} dB
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-purple-200 text-sm">-6.0 dB</span>
            <input
              type="range"
              min="-6.0"
              max="-0.1"
              step="0.1"
              value={truePeakLimit}
              onChange={handleTruePeakChange}
              className="w-full h-2 bg-purple-200/20 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-purple-200 text-sm">-0.1 dB</span>
          </div>
          
          <p className="text-purple-200/60 text-sm mt-2">
            Adjust the maximum True Peak level for broadcast compliance. Lower values provide more headroom but can reduce overall loudness.
          </p>
        </div>
        
        <button
          onClick={handleTruePeakAdjustment}
          disabled={isAdjustingTruePeak || !project?.mixedFile}
          className="w-full px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdjustingTruePeak ? "Processing..." : "Apply True Peak Limiting"}
        </button>
        
        {project?.processingDetails?.loudness?.truePeakLimit !== undefined && (
          <div className="mt-4 text-center text-purple-200 text-sm">
            Current True Peak Limit: {project.processingDetails.loudness.truePeakLimit.toFixed(1)} dB
          </div>
        )}
      </div>
    );
  };

  // Create a collapsible Advanced Controls component
  const AdvancedControls = () => (
    <div className="mb-4">
      <button
        onClick={() => setAdvancedControlsOpen(!advancedControlsOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 text-white font-medium mb-2"
      >
        <span className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 text-purple-300"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          Advanced Audio Controls
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-transform ${
            advancedControlsOpen ? "transform rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      
      {advancedControlsOpen && (
        <div className="transition-all duration-300 ease-in-out overflow-hidden">
          <div className="space-y-4">
            <LoudnessMeter
              measurements={loudnessMeasurements}
              onCheckLoudness={handleCheckLoudness}
            />
            <TruePeakControls />
          </div>
        </div>
      )}
    </div>
  );

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  Processed Files
                </h2>
                <button
                  onClick={() => setExpandedFile(expandedFile === 'all' ? null : 'all')}
                  className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-sm transition-colors"
                >
                  {expandedFile === 'all' ? "Hide All Details" : "Show All Details"}
                </button>
              </div>
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
                              expandedFile === index || (expandedFile === 'all' && index === 0) ? null : expandedFile === 'all' ? index : expandedFile === index - 1 ? index : 'all'
                            )
                          }
                          className="text-purple-200 hover:text-white transition-colors"
                        >
                          {expandedFile === index || expandedFile === 'all'
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
                    {(expandedFile === index || expandedFile === 'all') && <ProcessingInfo file={file} />}
                  </div>
                ))}
              </div>
            </div>

            {processingDetails && renderProcessingDetails()}

            {project.mixedFile ? (
              <div 
                id="final-mix-section" 
                className={`mb-6 transition-all duration-500 ${
                  showMixCreatedHighlight 
                    ? "bg-gradient-to-r from-purple-800/30 via-pink-600/30 to-purple-800/30 animate-pulse rounded-xl p-4"
                    : ""
                }`}
              >
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                  Final Mix
                  {showMixCreatedHighlight && (
                    <span className="ml-3 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full animate-bounce">
                      New!
                    </span>
                  )}
                </h2>
                <div className="p-6 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10">
                  <WaveformPlayer audioUrl={audioUrl} height={120} />
                </div>

                <AdvancedControls />

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
