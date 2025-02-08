import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-900/50 backdrop-blur-md text-white p-4 fixed w-full z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link
          to="/"
          className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"
        >
          AudioAlchemy
        </Link>

        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <Link
                to="/projects"
                className="hover:text-purple-300 transition-colors"
              >
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
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200
                  bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 
                  hover:to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
