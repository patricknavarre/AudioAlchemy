/**
 * @copyright Copyright (c) 2024 AudioAlchemist. All rights reserved.
 * @file App.jsx - Main application component implementing the core routing and layout structure
 *
 * This file contains proprietary and confidential code implementing AudioAlchemist's
 * unique user interface and application flow. Unauthorized copying, modification,
 * distribution, or use is strictly prohibited.
 */

import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Navigation from "./components/layout/Navigation";
import ProjectCreate from "./components/project/ProjectCreate";
import ProjectsList from "./components/project/ProjectsList";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ProjectView from "./components/project/ProjectView";
import HomePage from "./components/pages/HomePage";
import Cart from "./components/cart/Cart";
import { Toaster } from "react-hot-toast";
import StemSeparator from "./components/audio/StemSeparator";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login with return path
      navigate("/login", {
        state: { from: location.pathname },
        replace: true,
      });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 pt-20 px-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return user ? children : null;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
            <Navigation />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute>
                    <ProjectCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stems"
                element={
                  <ProtectedRoute>
                    <StemSeparator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              {/* Catch-all route for client-side routing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
