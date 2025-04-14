import { createContext, useState, useContext, useEffect } from "react";
import axios from "../config/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const validateToken = async (token) => {
    try {
      await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (err) {
      console.error("Token validation error:", err);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        const isValid = await validateToken(token);
        if (isValid) {
          const userData = JSON.parse(localStorage.getItem("user"));
          setUser(userData);
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          delete axios.defaults.headers.common["Authorization"];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      console.log("Attempting login...");

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        { email, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Login successful");
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      // Set the token in axios defaults
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      return true;
    } catch (error) {
      console.error("Login error:", {
        name: error.name,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      let errorMessage = "Login failed. Please try again.";

      if (error.response) {
        // Server responded with an error
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        // Request was made but no response
        errorMessage =
          "Unable to reach the server. Please check your connection.";
      }

      setError(errorMessage);
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      setError(null);
      console.log("Starting registration process...");
      console.log("API URL:", import.meta.env.VITE_API_URL);
      console.log(
        "Registration payload:",
        JSON.stringify(
          {
            name,
            email,
            password: "[REDACTED]",
          },
          null,
          2
        )
      );

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        { name, email, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Registration successful, response:",
        JSON.stringify(response.data, null, 2)
      );
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      return true;
    } catch (error) {
      console.error("Registration error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        },
        request: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data,
        },
      });

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Registration failed. Please try again.";
      console.error("Final error message:", errorMessage);
      setError(errorMessage);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        register,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
