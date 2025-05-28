import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Overview & Analytics'
    },
    {
      path: '/fleet',
      label: 'Fleet Manager',
      icon: '🚁',
      description: 'Drone Fleet Control'
    },
    {
      path: '/missions/plan',
      label: 'Mission Planner',
      icon: '🗺️',
      description: 'Plan Survey Missions'
    },
    {
      path: '/missions/monitor',
      label: 'Mission Monitor',
      icon: '📡',
      description: 'Real-time Monitoring'
    }
  ];

  const isActivePath = (path) => {
    return location.pathname === path || 
           (path === '/missions/plan' && location.pathname.startsWith('/missions'));
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      onLogout();
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand/Logo */}
        <div className="navbar-brand">
          <Link to="/dashboard" className="brand-link">
            <span className="brand-icon">✈️</span>
            <div className="brand-text">
              <h1>AeroSurvey</h1>
              <span className="brand-subtitle">Drone Operations</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="navbar-nav">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActivePath(item.path) ? 'active' : ''}`}
              title={item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User Menu */}
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-avatar">
              <span>{user.username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="user-details">
              <span className="user-name">{user.username}</span>
              <span className="user-role">
                {user.is_admin ? 'Administrator' : 'Operator'}
              </span>
            </div>
          </div>

          <div className="user-actions">
            <Link to="/profile" className="user-action" title="Profile">
              <span>👤</span>
            </Link>
            <button
              onClick={handleLogout}
              className="user-action logout-btn"
              title="Logout"
            >
              <span>🚪</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-header">
          <div className="mobile-user-info">
            <div className="user-avatar">
              <span>{user.username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="user-details">
              <span className="user-name">{user.username}</span>
              <span className="user-email">{user.email}</span>
              <span className="user-role">
                {user.is_admin ? 'Administrator' : 'Operator'}
              </span>
            </div>
          </div>
        </div>

        <div className="mobile-nav-items">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-item ${isActivePath(item.path) ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <div className="nav-content">
                <span className="nav-label">{item.label}</span>
                <span className="nav-description">{item.description}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mobile-nav-footer">
          <Link
            to="/profile"
            className="mobile-nav-item"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="nav-icon">👤</span>
            <div className="nav-content">
              <span className="nav-label">Profile</span>
              <span className="nav-description">Account Settings</span>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="mobile-nav-item logout"
          >
            <span className="nav-icon">🚪</span>
            <div className="nav-content">
              <span className="nav-label">Logout</span>
              <span className="nav-description">Sign out of account</span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
