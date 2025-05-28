// components/ProtectedRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  const checkAuthentication = () => {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      console.log('🔒 No token or user data found');
      return false;
    }

    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decodedToken.exp < currentTime) {
        console.log('🔒 Token expired');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔒 Token validation error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return false;
    }
  };

  useEffect(() => {
    setIsAuthenticated(checkAuthentication());
  }, []);

  if (isAuthenticated === null) {
    return <div className="loading">Checking authentication...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
