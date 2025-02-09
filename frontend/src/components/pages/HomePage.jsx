import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiMusic,
  FiSettings,
  FiDownload,
  FiZap,
  FiLayers,
  FiSliders,
  FiBarChart2,
  FiActivity,
  FiRadio,
} from "react-icons/fi";

const features = [
  {
    icon: <FiBarChart2 className="w-6 h-6" />,
    title: "Professional Loudness Control",
    description:
      "Industry-standard LUFS metering, loudness normalization, and precise gain staging for broadcast-ready audio.",
  },
  {
    icon: <FiMusic className="w-6 h-6" />,
    title: "Studio-Grade Mixing",
    description:
      "24-bit/48kHz processing, advanced stem control, and professional mixing chains for pristine audio quality.",
  },
  {
    icon: <FiActivity className="w-6 h-6" />,
    title: "Advanced Audio Analysis",
    description:
      "Real-time loudness measurement (LUFS), dynamic range analysis (LRA), and true peak metering (dBTP).",
  },
  {
    icon: <FiRadio className="w-6 h-6" />,
    title: "Industry-Ready Output",
    description:
      "Optimized presets for broadcast, streaming, music production, and content creation.",
  },
  {
    icon: <FiSliders className="w-6 h-6" />,
    title: "Precision Controls",
    description:
      "Fine-tune your mix with target LUFS adjustment (-23 to -14 LUFS) and post-normalization gain control.",
  },
  {
    icon: <FiZap className="w-6 h-6" />,
    title: "Intelligent Processing",
    description:
      "AI-powered mixing algorithms that analyze and enhance your audio automatically.",
  },
];

const industries = [
  {
    title: "Broadcast & Streaming",
    description: "Television and streaming platform compliant mixes",
    gradient: "from-blue-500 to-indigo-500",
    icon: "📺",
  },
  {
    title: "Music Production",
    description: "Professional stem mixing and processing",
    gradient: "from-purple-500 to-pink-500",
    icon: "🎵",
  },
  {
    title: "Content Creation",
    description: "Optimized for YouTube, podcasts, and social media",
    gradient: "from-orange-500 to-red-500",
    icon: "🎬",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200">
            Professional Audio Mixing with AI-Powered Control
          </h1>
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            Transform your stems into broadcast-ready mixes with
            industry-standard loudness control, professional processing chains,
            and intelligent audio analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 rounded-xl font-medium text-lg transition-all duration-200
                bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 
                hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
            <Link
              to="/projects"
              className="px-8 py-4 rounded-xl font-medium text-lg transition-all duration-200
                bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm
                hover:shadow-lg hover:-translate-y-0.5"
            >
              View Projects
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
              Professional-Grade Features
            </h2>
            <p className="text-lg text-purple-200 max-w-2xl mx-auto">
              Studio-quality audio processing with advanced loudness control and
              precise metering.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10
                  hover:border-purple-500/50 transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                  flex items-center justify-center text-white mb-4"
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-purple-200">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
              Industry-Ready Solutions
            </h2>
            <p className="text-lg text-purple-200 max-w-2xl mx-auto">
              Optimized presets and processing chains for every professional
              audio application.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {industries.map((industry, index) => (
              <motion.div
                key={industry.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10
                  hover:border-purple-500/50 transition-all duration-300"
              >
                <div
                  className={`bg-gradient-to-br ${industry.gradient} p-4 rounded-xl w-16 h-16 flex items-center justify-center text-3xl mb-4`}
                >
                  {industry.icon}
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {industry.title}
                </h3>
                <p className="text-purple-200">{industry.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
            Ready for Professional Audio?
          </h2>
          <p className="text-lg text-purple-200 mb-8">
            Join the future of audio production with our AI-powered platform.
            Create broadcast-ready, professionally mixed audio with just a few
            clicks.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 rounded-xl font-medium text-lg transition-all duration-200
              bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 
              hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
          >
            Start Your Free Account
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
