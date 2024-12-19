import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/layout/Navigation';
import ProjectCreate from './components/project/ProjectCreate';
import ProjectsList from './components/project/ProjectsList';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import { useAuth } from './context/AuthContext';
import ProjectView from './components/project/ProjectView';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login with return path
      navigate('/login', { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [user, loading, navigate, location]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return user ? children : null;
}

function AppRoutes() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/" 
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
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App; 