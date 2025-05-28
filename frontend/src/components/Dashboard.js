import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { missionsAPI, dronesAPI } from '../services/api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMissions: 0,
    activeMissions: 0,
    totalDrones: 0,
    availableDrones: 0
  });
  const [missionTypeData, setMissionTypeData] = useState([]);
  const [recentMissions, setRecentMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data concurrently
      const [missionsResponse, dronesResponse, statsResponse] = await Promise.all([
        missionsAPI.getMissions(),
        dronesAPI.getDrones(),
        missionsAPI.getStats()
      ]);

      // Process mission type data dynamically
      const missions = missionsResponse.data;
      const missionTypeCounts = processMissionTypeData(missions);
      setMissionTypeData(missionTypeCounts);

      // Process general stats
      const drones = dronesResponse.data;
      setStats({
        totalMissions: missions.length,
        activeMissions: missions.filter(m => ['in_progress', 'paused'].includes(m.status)).length,
        totalDrones: drones.length,
        availableDrones: drones.filter(d => d.status === 'available').length
      });

      // Get recent missions (last 10)
      const sortedMissions = missions
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
      setRecentMissions(sortedMissions);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const processMissionTypeData = (missions) => {
    // Count missions by type
    const typeCounts = missions.reduce((acc, mission) => {
      const type = mission.mission_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Convert to chart format with proper labels
    const typeLabels = {
      'inspection': 'Inspection',
      'mapping': 'Mapping',
      'security_patrol': 'Security',
      'survey': 'Survey'
    };

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1),
      count: count,
      type: type // Keep original type for filtering
    }));
  };

  const getStatusColor = (status) => {
    const colors = {
      'planned': '#6c757d',
      'in_progress': '#28a745',
      'paused': '#ffc107',
      'completed': '#17a2b8',
      'aborted': '#dc3545',
      'failed': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loading-spinner">Loading AeroSurvey Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>AeroSurvey Dashboard</h1>
        <p>Comprehensive overview of your drone survey operations</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <span>🚁</span>
          </div>
          <div className="stat-content">
            <h3>{stats.totalDrones}</h3>
            <p>Total Drones</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <span>✅</span>
          </div>
          <div className="stat-content">
            <h3>{stats.availableDrones}</h3>
            <p>Available Drones</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <span>📋</span>
          </div>
          <div className="stat-content">
            <h3>{stats.totalMissions}</h3>
            <p>Total Missions</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <span>🔄</span>
          </div>
          <div className="stat-content">
            <h3>{stats.activeMissions}</h3>
            <p>Active Missions</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Mission Types Distribution</h3>
          {missionTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={missionTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Missions']}
                  labelFormatter={(label) => `${label} Missions`}
                />
                <Legend />
                <Bar 
                  dataKey="count" 
                  fill="#667eea" 
                  name="Mission Count"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">
              <p>No mission data available</p>
              <button onClick={fetchDashboardData} className="btn-secondary">
                Refresh Data
              </button>
            </div>
          )}
        </div>

<div className="chart-container">
  <h3>Mission Status Overview</h3>
  <div className="status-summary">
    {recentMissions.length > 0 ? (
      <div className="status-grid">
        <div className="status-item planned">
          <span className="status-label">Planned</span>
          <span className="status-value">
            {recentMissions.filter(m => m.status === 'planned').length}
          </span>
        </div>
        <div className="status-item in-progress">
          <span className="status-label">In Progress</span>
          <span className="status-value">
            {recentMissions.filter(m => m.status === 'in_progress').length}
          </span>
        </div>
        <div className="status-item completed">
          <span className="status-label">Completed</span>
          <span className="status-value">
            {recentMissions.filter(m => m.status === 'completed').length}
          </span>
        </div>
        <div className="status-item aborted">
          <span className="status-label">Aborted</span>
          <span className="status-value">
            {recentMissions.filter(m => m.status === 'aborted').length}
          </span>
        </div>
      </div>
    ) : (
      <div className="no-data">
        <p>No mission status data available</p>
        <button onClick={fetchDashboardData} className="btn-secondary">
          Refresh Data
        </button>
      </div>
    )}
  </div>
</div>

      </div>

      {/* Recent Missions */}
      <div className="recent-missions">
        <h3>Recent Missions</h3>
        {recentMissions.length > 0 ? (
          <div className="missions-table">
            <table>
              <thead>
                <tr>
                  <th>Mission Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentMissions.map(mission => (
                  <tr key={mission.id}>
                    <td>{mission.name}</td>
                    <td>
                      <span className="mission-type">
                        {mission.mission_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(mission.status) }}
                      >
                        {mission.status === 'aborted' ? 'Cancelled' : mission.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${mission.progress_percentage}%` }}
                          />
                        </div>
                        <span className="progress-text">
                          {mission.progress_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>{formatDate(mission.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-missions">
            <p>No recent missions found</p>
            <button onClick={fetchDashboardData} className="btn-primary">
              Refresh Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
