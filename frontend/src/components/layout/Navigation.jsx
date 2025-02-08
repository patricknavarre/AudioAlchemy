import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          AudioAlchemy
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/" className="hover:text-purple-300 transition-colors">
                Projects
              </Link>
              <Link
                to="/projects/new"
                className="hover:text-purple-300 transition-colors"
              >
                New Project
              </Link>
              <button
                onClick={logout}
                className="hover:text-purple-300 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hover:text-purple-300 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="hover:text-purple-300 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
