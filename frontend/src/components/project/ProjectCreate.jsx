import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { FiMusic, FiUpload, FiX } from "react-icons/fi";

const STYLES = [
  {
    id: "pop",
    label: "Pop",
    gradient: "from-pink-500 to-purple-500",
    icon: "🎵",
  },
  {
    id: "rock",
    label: "Rock",
    gradient: "from-red-500 to-orange-500",
    icon: "🎸",
  },
  {
    id: "hiphop",
    label: "Hip Hop",
    gradient: "from-blue-500 to-indigo-500",
    icon: "🎤",
  },
  {
    id: "electronic",
    label: "Electronic",
    gradient: "from-cyan-500 to-blue-500",
    icon: "🎹",
  },
  {
    id: "acoustic",
    label: "Acoustic",
    gradient: "from-amber-500 to-yellow-500",
    icon: "🪕",
  },
  {
    id: "jazz",
    label: "Jazz",
    gradient: "from-purple-500 to-indigo-500",
    icon: "🎷",
  },
  {
    id: "classical",
    label: "Classical",
    gradient: "from-emerald-500 to-teal-500",
    icon: "🎻",
  },
  {
    id: "rnb",
    label: "R&B",
    gradient: "from-violet-500 to-purple-500",
    icon: "🎙️",
  },
];

const ProjectCreate = () => {
  const [files, setFiles] = useState([]);
  const [mixStyle, setMixStyle] = useState("pop");
  const [projectName, setProjectName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 8) {
      toast.error("Maximum 8 files allowed");
      return;
    }
    setFiles(selectedFiles);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("stems", file);
      });
      formData.append("mixStyle", mixStyle);
      formData.append("name", projectName.trim());

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      console.log("Project created:", response.data);

      // Store project data in localStorage
      localStorage.setItem(
        `project_${response.data.project._id}`,
        JSON.stringify(response.data.project)
      );

      toast.success("Project created successfully!");
      // Navigate to the new project page with the correct project data
      navigate(`/projects/${response.data.project._id}`, {
        state: { project: response.data.project },
      });
    } catch (error) {
      console.error("Project creation error:", error);
      toast.error(error.response?.data?.message || "Error creating project");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-4 md:p-8"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
            Create New Project
          </h1>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-purple-800/30 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-purple-700/50"
          >
            <label className="block text-2xl font-medium mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
              Project Name
            </label>
            <div className="relative">
              <FiMusic className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 text-xl" />
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full pl-12 p-4 rounded-2xl bg-purple-700/20 border-2 border-purple-400/30 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all duration-300"
                disabled={isUploading}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-purple-800/30 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-purple-700/50"
          >
            <label className="block text-2xl font-medium mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
              Upload Stems
            </label>
            <div className="border-2 border-dashed border-purple-400/30 rounded-2xl p-8 bg-purple-700/20 transition-all duration-300 hover:border-purple-400/50">
              <div className="flex flex-col items-center justify-center">
                <FiUpload className="text-4xl text-purple-300 mb-4" />
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                >
                  Choose Files
                </label>
                <p className="text-sm text-purple-200 mt-4 opacity-80">
                  Supported formats: WAV, MP3, AIF, AIFF (up to 8 files)
                </p>
              </div>
            </div>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-purple-700/20 rounded-xl border border-purple-400/30"
              >
                <p className="text-sm text-purple-200 mb-3">
                  {files.length} file{files.length !== 1 ? "s" : ""} selected
                </p>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-2 rounded-lg bg-purple-600/20 group hover:bg-purple-600/30 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-purple-500/50 flex items-center justify-center text-xs font-medium text-white">
                          {index + 1}
                        </span>
                        <span className="text-sm text-purple-200">
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 rounded-full hover:bg-purple-500/50 text-purple-300 hover:text-white transition-all duration-300"
                      >
                        <FiX />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-purple-800/30 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-purple-700/50"
          >
            <label className="block text-2xl font-medium mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
              Mix Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STYLES.map((style) => (
                <motion.button
                  key={style.id}
                  type="button"
                  onClick={() => setMixStyle(style.id)}
                  disabled={isUploading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-6 rounded-2xl transition-all duration-300 overflow-hidden group ${
                    mixStyle === style.id
                      ? "ring-2 ring-purple-400 shadow-lg scale-[1.02]"
                      : "hover:ring-2 hover:ring-purple-400/50"
                  }`}
                >
                  <div className="absolute inset-0">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-80`}
                    />
                  </div>
                  <div className="relative flex flex-col items-center space-y-2">
                    <span className="text-2xl">{style.icon}</span>
                    <span className="text-lg font-medium text-white">
                      {style.label}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            type="submit"
            disabled={files.length === 0 || isUploading || !projectName.trim()}
            className={`relative w-full py-4 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 overflow-hidden ${
              files.length === 0 || isUploading || !projectName.trim()
                ? "bg-purple-600/50 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            }`}
          >
            {isUploading && (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            <span className="relative flex items-center justify-center space-x-2">
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Project... {uploadProgress}%</span>
                </>
              ) : (
                "Create Project"
              )}
            </span>
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default ProjectCreate;
