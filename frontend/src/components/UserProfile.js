// components/UserProfile.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      toast.error('Failed to load profile');
      // Redirect to login if unauthorized
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error">
        <h3>Profile not found</h3>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>User Profile</h2>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          ← Back
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          
          <div className="profile-info">
            <div className="info-group">
              <label>Username:</label>
              <span>{user.username}</span>
            </div>
            
            <div className="info-group">
              <label>Email:</label>
              <span>{user.email}</span>
            </div>
            
            <div className="info-group">
              <label>Role:</label>
              <span className={`role-badge ${user.is_admin ? 'admin' : 'operator'}`}>
                {user.is_admin ? 'Administrator' : 'Operator'}
              </span>
            </div>
            
            <div className="info-group">
              <label>Member Since:</label>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            
            {user.last_login && (
              <div className="info-group">
                <label>Last Login:</label>
                <span>{new Date(user.last_login).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="profile-actions">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn-primary"
          >
            Go to Dashboard
          </button>
          <button 
            onClick={handleLogout} 
            className="btn-danger"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
