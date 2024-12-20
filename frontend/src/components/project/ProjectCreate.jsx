import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const MIX_STYLES = {
  pop: {
    icon: "🎵",
    name: "Pop",
    description: "Bright, punchy mix with emphasis on vocals and beat"
  },
  rock: {
    icon: "🎸",
    name: "Rock",
    description: "Aggressive, guitar-driven mix with power and energy"
  },
  electronic: {
    icon: "💫",
    name: "Electronic",
    description: "Clean, wide mix with deep bass and crisp highs"
  },
  acoustic: {
    icon: "🎻",
    name: "Acoustic",
    description: "Natural, dynamic mix with warmth and space"
  },
  hiphop: {
    icon: "🎤",
    name: "Hip Hop",
    description: "Bass-heavy mix with punchy drums and clear vocals"
  }
};

export default function ProjectCreate() {
  const [name, setName] = useState('');
  const [files, setFiles] = useState([]);
  const [mixStyle, setMixStyle] = useState('pop');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUploadProgress(0);

    try {
      if (!files || files.length === 0) {
        setError('Please select at least one audio file');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('mixStyle', mixStyle);
      
      console.log('Files to upload:', {
        count: files.length,
        files: Array.from(files).map(f => ({
          name: f.name,
          type: f.type,
          size: f.size
        }))
      });

      Array.from(files).forEach((file, index) => {
        console.log(`Appending file ${index + 1}:`, {
          name: file.name,
          type: file.type,
          size: file.size
        });
        formData.append('stems', file);
      });

      // Log the FormData contents
      console.log('FormData entries:', Array.from(formData.entries()).map(([key, value]) => ({
        key,
        value: value instanceof File ? {
          name: value.name,
          type: value.type,
          size: value.size
        } : value
      })));

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setUploadProgress(Math.round(progress));
          }
        }
      );

      console.log('Project created:', response.data);
      navigate(`/projects/${response.data._id}`);
    } catch (err) {
      console.error('Project creation error:', {
        message: err.message,
        response: {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        },
        request: {
          method: err.config?.method,
          url: err.config?.url,
          headers: err.config?.headers,
          data: err.config?.data instanceof FormData ? 
            Array.from(err.config.data.entries()).map(([key, value]) => ({
              key,
              value: value instanceof File ? {
                name: value.name,
                type: value.type,
                size: value.size
              } : value
            })) : err.config?.data
        }
      });
      setError(err.response?.data?.message || 'Error creating project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h1 className="text-4xl font-bold text-white mb-2">Create New Project</h1>
          <p className="text-purple-200 mb-8">Start your next masterpiece</p>
          
          {error && (
            <div className="mb-6 p-3 bg-red-900/30 border-l-4 border-red-500 text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block mb-2 text-lg font-medium text-white">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-white/5 border border-purple-300/20 rounded-xl 
                  focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20
                  text-white placeholder-purple-300/50 transition-all"
                placeholder="Enter your project name"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block mb-4 text-lg font-medium text-white">Choose Mix Style</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(MIX_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMixStyle(key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 backdrop-blur-lg
                      ${mixStyle === key 
                        ? 'border-pink-500/50 bg-white/10 shadow-lg' 
                        : 'border-purple-300/20 hover:border-purple-400/30 bg-white/5'
                      }`}
                  >
                    <span className="text-3xl mb-3 block">{style.icon}</span>
                    <h3 className="font-bold text-white mb-1">{style.name}</h3>
                    <p className="text-sm text-purple-200">{style.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-lg font-medium text-white">Upload Stems</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={(e) => setFiles(e.target.files)}
                  className="w-full p-3 bg-white/5 border border-purple-300/20 rounded-xl 
                    focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20
                    text-purple-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0
                    file:bg-purple-500/20 file:text-purple-200 hover:file:bg-purple-500/30
                    transition-all cursor-pointer"
                  multiple
                  accept=".wav,.mp3,.aif,.aiff"
                  disabled={loading}
                  max="8"
                />
              </div>
              <p className="text-sm text-purple-300/70 mt-2">
                Supported formats: WAV, MP3, AIF, AIFF (up to 8 files)
              </p>
            </div>

            {uploadProgress > 0 && (
              <div className="w-full bg-purple-900/30 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full p-4 rounded-xl font-medium transition-all duration-200
                ${loading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating Your Project...</span>
                </div>
              ) : (
                'Create Project'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 