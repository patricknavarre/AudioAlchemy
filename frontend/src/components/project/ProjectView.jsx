import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import WaveformPlayer from '../audio/WaveformPlayer';

export default function ProjectView() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mixing, setMixing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [processingDetails, setProcessingDetails] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (project?.mixedFile?.fileName) {
      const url = `${import.meta.env.VITE_API_URL}/api/projects/mixed/${project.mixedFile.fileName}`;
      console.log('Setting mixed audio URL:', url, {
        mixedFile: project.mixedFile,
        fullUrl: url
      });
      setAudioUrl(url);
    }
  }, [project]);

  useEffect(() => {
    if (project?.files) {
      const processedFiles = project.files.map(file => {
        const fileName = file.processedPath.split('/').pop();
        const url = `${import.meta.env.VITE_API_URL}/api/projects/processed/${fileName}`;
        console.log('Setting processed file URL:', url);
        return {
          ...file,
          audioUrl: url
        };
      });
      setProcessedFiles(processedFiles);
    }
  }, [project]);

  const fetchProject = async () => {
    try {
      console.log('Fetching project with ID:', id);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      console.log('Project data received:', response.data);
      setProject(response.data);
    } catch (err) {
      console.error('Project fetch error:', err);
      setError(err.response?.data?.message || 'Error fetching project');
    } finally {
      setLoading(false);
    }
  };

  const handleMix = async () => {
    try {
      setMixing(true);
      setProcessingDetails(null);
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects/${id}/mix`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      console.log('Mix response:', response.data);
      
      if (response.data.processingDetails) {
        setProcessingDetails(response.data.processingDetails);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fetchProject();
    } catch (err) {
      console.error('Mix error:', err);
      setError(err.response?.data?.message || 'Error mixing project');
    } finally {
      setMixing(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!project.mixedFile?.fileName) {
        throw new Error('No mixed file available');
      }
      
      console.log('Downloading mix:', {
        fileName: project.mixedFile.fileName,
        url: `${import.meta.env.VITE_API_URL}/api/projects/download/mixed/${project.mixedFile.fileName}`
      });
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects/download/mixed/${project.mixedFile.fileName}`,
        {
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', project.mixedFile.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download mix');
    }
  };

  const renderProcessingDetails = () => {
    if (!processingDetails) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Processing Details</h2>
        <div className="space-y-4">
          {processingDetails.files.map((file, index) => (
            <div key={index} className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10">
              <h3 className="font-medium text-white mb-2">
                {file.name} ({file.stemType})
              </h3>
              <div className="space-y-2">
                {file.analysis && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {file.analysis.issues && (
                      <div className="col-span-2">
                        <h4 className="text-purple-200 mb-1">Issues Detected & Fixed:</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(file.analysis.issues)
                            .filter(([_, value]) => value)
                            .map(([issue]) => (
                              <span key={issue} className="px-2 py-1 rounded-full bg-white/10 text-purple-200 text-xs">
                                {issue.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    {file.analysis.frequency && (
                      <>
                        <div>
                          <h4 className="text-purple-200 mb-1">Frequency Analysis:</h4>
                          <ul className="list-disc list-inside text-purple-200/70">
                            {Object.entries(file.analysis.frequency.bands).map(([band, data]) => (
                              <li key={band}>
                                {band}: {data.energy.toFixed(2)} energy
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-purple-200 mb-1">Dynamics:</h4>
                          <ul className="list-disc list-inside text-purple-200/70">
                            <li>Crest Factor: {file.analysis.dynamics.crestFactor.toFixed(1)}</li>
                            <li>Stereo Width: {(file.analysis.stereo?.width_ratio || 0).toFixed(2)}</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {file.processing && (
                  <div>
                    <h4 className="text-purple-200 mb-1">Processing Applied:</h4>
                    <div className="flex flex-wrap gap-2">
                      {file.processing.filters.map((filter, i) => (
                        <span key={i} className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs">
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
                <p>Mixed {processingDetails.files.length} stems using {processingDetails.mixingDetails.method}</p>
                <p>Output Format: {processingDetails.mixingDetails.format}</p>
                <p>Sample Rate: {processingDetails.mixingDetails.sampleRate}Hz</p>
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
        onError={(e) => console.error('Audio element error:', e)}
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-4 py-8">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-3 text-white">
            <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
              <h1 className="text-4xl font-bold text-white mb-2">{project.name}</h1>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-purple-200 text-sm">
                  {project.mixStyle}
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Stems</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {project.files.map((file, index) => (
                  <div key={index} className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10">
                    <p className="font-medium text-white mb-1">{file.stemType}</p>
                    <p className="text-sm text-purple-200">{file.originalPath.split('/').pop()}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Processed Files</h2>
              <div className="space-y-6">
                {processedFiles.map((file, index) => (
                  <div key={index} className="p-6 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10">
                    <p className="font-medium text-white mb-3">{file.stemType}</p>
                    <WaveformPlayer 
                      audioUrl={file.audioUrl}
                      height={80}
                    />
                  </div>
                ))}
              </div>
            </div>

            {processingDetails && renderProcessingDetails()}

            {project.mixedFile ? (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-4">Final Mix</h2>
                {audioUrl && (
                  <>
                    <div className="p-6 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 mb-4">
                      <WaveformPlayer audioUrl={audioUrl} height={120} />
                      <AudioPlayer url={audioUrl} />
                    </div>
                    <button
                      onClick={handleDownload}
                      className="w-full p-4 rounded-xl font-medium transition-all duration-200
                        bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 
                        hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
                    >
                      Download Mix
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleMix}
                disabled={mixing}
                className={`w-full p-4 rounded-xl font-medium transition-all duration-200
                  ${mixing 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                  }`}
              >
                {mixing ? (
                  <div className="flex items-center justify-center space-x-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating Mix...</span>
                  </div>
                ) : (
                  'Create Mix'
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 