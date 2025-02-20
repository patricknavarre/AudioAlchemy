import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  FiHome,
  FiMusic,
  FiLogOut,
  FiUser,
  FiShoppingCart,
} from "react-icons/fi";

export default function Navigation() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-white font-bold text-xl flex items-center space-x-2"
            >
              <FiMusic className="h-6 w-6" />
              <span>Audio Alchemy</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/"
                  className="text-purple-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
                >
                  <FiHome className="h-4 w-4" />
                  <span>Home</span>
                </Link>

                <Link
                  to="/projects"
                  className="text-purple-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
                >
                  <FiMusic className="h-4 w-4" />
                  <span>Projects</span>
                </Link>

                <Link
                  to="/cart"
                  className="text-purple-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 relative"
                >
                  <FiShoppingCart className="h-4 w-4" />
                  <span>Shopping Cart</span>
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-purple-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
                >
                  <FiLogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>

                <div className="flex items-center space-x-2 text-purple-200 px-3 py-2">
                  <FiUser className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-purple-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-purple-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
