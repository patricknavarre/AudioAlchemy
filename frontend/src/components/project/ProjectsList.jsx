import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching projects with token:', token);
        
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/projects`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        console.log('Projects response:', response.data);
        setProjects(response.data);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err.response?.data?.message || 'Error fetching projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
        <div className="flex items-center space-x-3 text-white">
          <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl font-medium">Loading your projects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {error ? (
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="mb-4 p-3 bg-red-900/30 border-l-4 border-red-500 text-red-200">
              {error}
            </div>
            <Link
              to="/projects/new"
              className="inline-block px-6 py-3 rounded-xl font-medium transition-all duration-200
                bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 
                text-white hover:shadow-lg hover:-translate-y-0.5"
            >
              Create New Project
            </Link>
          </div>
        ) : (
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-white">My Projects</h1>
              <Link
                to="/projects/new"
                className="px-6 py-3 rounded-xl font-medium transition-all duration-200
                  bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 
                  text-white hover:shadow-lg hover:-translate-y-0.5"
              >
                New Project
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-purple-200 text-lg mb-6">Ready to create some amazing mixes?</p>
                <Link
                  to="/projects/new"
                  className="inline-block px-8 py-4 rounded-xl font-medium transition-all duration-200
                    bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 
                    text-white hover:shadow-lg hover:-translate-y-0.5"
                >
                  Create your first project
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                  <Link
                    key={project._id}
                    to={`/projects/${project._id}`}
                    className="block p-6 rounded-xl transition-all duration-200
                      backdrop-blur-lg bg-white/5 border border-white/10
                      hover:bg-white/10 hover:shadow-lg hover:-translate-y-1"
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
                    <div className="space-y-2">
                      <p className="text-purple-200 text-sm">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-purple-200 text-sm flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-2"></span>
                        {project.files?.length || 0} audio files
                      </p>
                      {project.mixedFile && (
                        <p className="text-purple-200 text-sm flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-pink-400 mr-2"></span>
                          Mix ready
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 