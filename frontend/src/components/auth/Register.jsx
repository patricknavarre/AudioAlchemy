import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(name, email, password);
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to register. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 px-4">
      <div className="w-full max-w-sm backdrop-blur-lg bg-white/10 p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <h1 className="text-4xl font-bold text-center text-white mb-2">Register</h1>
        <p className="text-center text-purple-200 mb-8">Create your itMix account</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border-l-4 border-red-500 text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-white/5 border border-purple-300/20 rounded-xl 
                focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20
                text-white placeholder-purple-300/50 transition-all"
              placeholder="Name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-white/5 border border-purple-300/20 rounded-xl 
                focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20
                text-white placeholder-purple-300/50 transition-all"
              placeholder="Email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white/5 border border-purple-300/20 rounded-xl 
                focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20
                text-white placeholder-purple-300/50 transition-all"
              placeholder="Password"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-xl font-medium transition-all duration-200
              ${loading 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5'
              }`}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p className="text-center text-purple-200">
            Already have an account?{' '}
            <Link to="/login" className="text-pink-300 hover:text-pink-200 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
} 