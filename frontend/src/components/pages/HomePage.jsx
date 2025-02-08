import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiMusic,
  FiSettings,
  FiDownload,
  FiZap,
  FiLayers,
  FiSliders,
} from "react-icons/fi";

const features = [
  {
    icon: <FiMusic className="w-6 h-6" />,
    title: "Stem Upload",
    description:
      "Upload up to 8 audio stems in various formats including WAV, MP3, and AIFF.",
  },
  {
    icon: <FiSettings className="w-6 h-6" />,
    title: "Smart Mixing",
    description:
      "Advanced AI-powered mixing algorithms that analyze and enhance your audio.",
  },
  {
    icon: <FiZap className="w-6 h-6" />,
    title: "Real-time Processing",
    description:
      "Process your audio in real-time with professional-grade effects and filters.",
  },
  {
    icon: <FiLayers className="w-6 h-6" />,
    title: "Multiple Mix Styles",
    description:
      "Choose from various mix styles including Pop, Rock, Electronic, and more.",
  },
  {
    icon: <FiSliders className="w-6 h-6" />,
    title: "Advanced Controls",
    description:
      "Fine-tune your mix with precise volume controls and stem adjustments.",
  },
  {
    icon: <FiDownload className="w-6 h-6" />,
    title: "High-Quality Export",
    description:
      "Export your final mix in high-quality formats ready for distribution.",
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
            Transform Your Audio with AI-Powered Mixing
          </h1>
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            AudioAlchemy combines cutting-edge AI technology with professional
            audio processing to deliver studio-quality mixes automatically.
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
              Powerful Features
            </h2>
            <p className="text-lg text-purple-200 max-w-2xl mx-auto">
              Everything you need to create professional-quality mixes without
              the complexity of traditional DAWs.
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

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
            Ready to Transform Your Audio?
          </h2>
          <p className="text-lg text-purple-200 mb-8">
            Experience the future of audio production with our AI-powered mixing
            platform. Start creating professional-quality mixes today with just
            a few clicks.
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
