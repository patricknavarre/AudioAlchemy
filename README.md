# 🎵 AudioAlchemy

AudioAlchemy is a modern web application that transforms your audio stems into perfectly mixed tracks. Using advanced audio processing and AI-driven analysis, it helps you achieve professional-quality mixes with ease.

## ✨ Features

- 🎚️ Smart stem mixing with automatic audio analysis
- 🔊 Multiple mixing styles (Pop, Rock, Electronic, Acoustic, Hip Hop)
- 📊 Real-time audio processing visualization
- 🎛️ Detailed audio analysis and processing insights
- 💫 Modern, intuitive interface with real-time feedback
- 🎼 Support for multiple audio formats (WAV, MP3, AIF, AIFF)

## 🚀 Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Audio Processing**: FFmpeg
- **Authentication**: JWT

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/patricknavarre/AudioAlchemy.git
cd AudioAlchemy
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
# Backend (.env)
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=5000

# Frontend (.env)
VITE_API_URL=http://localhost:5000
```

4. Run the application:
```bash
# Run backend (from backend directory)
npm start

# Run frontend (from frontend directory)
npm run dev
```

## 🎯 Usage

1. Register an account or login
2. Create a new project
3. Upload your audio stems (up to 8 files)
4. Choose your desired mix style
5. Let AudioAlchemy work its magic
6. Download your professionally mixed track

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/patricknavarre/AudioAlchemy/issues).

## 📝 License

This project is [MIT](LICENSE) licensed. 