// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FleetManager from './components/FleetManager';
import MissionPlanner from './components/MissionPlanner';
import MissionMonitor from './components/MissionMonitor';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Component wrapper to reset state on route change
const ComponentWrapper = ({ children }) => {
  const location = useLocation();
  
  // Force re-render when route changes by using location.pathname as key
  return (
    <div key={location.pathname}>
      {children}
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading AeroSurvey...</div>;
  }

  return (
    <Router>
      <div className="App">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <ComponentWrapper>
                  <Dashboard />
                </ComponentWrapper>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/fleet" 
            element={
              <ProtectedRoute>
                <ComponentWrapper>
                  <FleetManager />
                </ComponentWrapper>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/missions/plan" 
            element={
              <ProtectedRoute>
                <ComponentWrapper>
                  <MissionPlanner />
                </ComponentWrapper>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/missions/monitor" 
            element={
              <ProtectedRoute>
                <ComponentWrapper>
                  <MissionMonitor />
                </ComponentWrapper>
              </ProtectedRoute>
            } 
          />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
