import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          itMix
        </Link>
        <div className="space-x-4">
          {user ? (
            <>
              <Link to="/" className="hover:text-gray-300">Projects</Link>
              <Link to="/projects/new" className="hover:text-gray-300">New Project</Link>
              <button 
                onClick={logout}
                className="hover:text-gray-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-gray-300">Login</Link>
              <Link to="/register" className="hover:text-gray-300">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 