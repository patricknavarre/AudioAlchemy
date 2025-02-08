import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiTrash2 } from "react-icons/fi";

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingProject, setDeletingProject] = useState(null);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Fetching projects with token:", token);

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Projects response:", response.data);
      setProjects(response.data);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err.response?.data?.message || "Error fetching projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (projectId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingProject(projectId);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Project deleted successfully");
      // Refresh projects list
      fetchProjects();
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error(err.response?.data?.message || "Error deleting project");
    } finally {
      setDeletingProject(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
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
          <span className="text-xl font-medium">Loading your projects...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-900/30 border-l-4 border-red-500 text-red-200 p-4 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
            My Projects
          </h1>
          <Link
            to="/projects/new"
            className="px-6 py-3 rounded-xl font-medium transition-all duration-200
              bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 
              hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
          >
            New Project
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project._id}
              className="relative group bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all duration-300"
            >
              <Link to={`/projects/${project._id}`} className="block">
                <h2 className="text-xl font-semibold text-white mb-2">
                  {project.name}
                </h2>
                <div className="space-y-2">
                  <p className="text-purple-200 text-sm">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-purple-200 text-sm">
                    {project.files?.length || 0} audio files
                  </p>
                  {project.mixedFile && (
                    <p className="text-green-300 text-sm">Mix ready</p>
                  )}
                </div>
              </Link>

              <button
                onClick={() => handleDelete(project._id)}
                disabled={deletingProject === project._id}
                className="absolute top-4 right-4 p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 
                  text-red-300 hover:text-red-200 transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                {deletingProject === project._id ? (
                  <svg
                    className="animate-spin h-5 w-5"
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
                ) : (
                  <FiTrash2 className="w-5 h-5" />
                )}
              </button>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-purple-200 text-lg mb-4">No projects yet</p>
            <Link
              to="/projects/new"
              className="inline-block px-6 py-3 rounded-xl font-medium transition-all duration-200
                bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 
                hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
            >
              Create your first project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
