import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Popup } from 'react-leaflet';
import { missionsAPI } from '../services/api';
import { toast } from 'react-toastify';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom drone icon
const createDroneIcon = () => {
  return L.divIcon({
    html: `<div style="
      background: #007bff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        color: #007bff;
        font-size: 16px;
      ">🚁</div>
    </div>`,
    className: 'drone-position-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
};

const MissionMonitor = () => {
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [missionDetails, setMissionDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingMission, setEditingMission] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    flight_altitude: 50,
    flight_speed: 5.0,
    overlap_percentage: 70
  });
  const [realTimeData, setRealTimeData] = useState({
    battery: 85,
    gpsSignal: 'Strong',
    connectionStatus: 'online',
    currentAction: 'Capturing Images',
    satellites: 12,
    currentPosition: null
  });

  const getRandomAction = useCallback(() => {
    const actions = [
      'Capturing Images',
      'Recording Video',
      'Navigating to Waypoint',
      'Hovering',
      'Adjusting Altitude',
      'Scanning Area',
      'Thermal Scanning',
      'Data Processing',
      'Position Adjustment'
    ];
    return actions[Math.floor(Math.random() * actions.length)];
  }, []);

  // Enhanced real-time data simulation with drone position
  const simulateRealTimeData = useCallback(() => {
    setRealTimeData(prev => {
      let newPosition = prev.currentPosition;
      
      // Simulate drone movement within survey area if mission is active
      if (selectedMission && selectedMission.status === 'in_progress' && missionDetails?.survey_area) {
        const surveyCoords = missionDetails.survey_area.coordinates[0];
        const minLat = Math.min(...surveyCoords.map(coord => coord[1]));
        const maxLat = Math.max(...surveyCoords.map(coord => coord[1]));
        const minLng = Math.min(...surveyCoords.map(coord => coord[0]));
        const maxLng = Math.max(...surveyCoords.map(coord => coord[0]));
        
        // Random position within survey area
        const randomLat = minLat + Math.random() * (maxLat - minLat);
        const randomLng = minLng + Math.random() * (maxLng - minLng);
        newPosition = [randomLat, randomLng];
      }
      
      return {
        ...prev,
        battery: Math.max(15, prev.battery - Math.random() * 1.5),
        satellites: 10 + Math.floor(Math.random() * 5),
        currentAction: getRandomAction(),
        connectionStatus: Math.random() > 0.95 ? 'reconnecting' : 'online',
        currentPosition: newPosition
      };
    });
  }, [getRandomAction, selectedMission, missionDetails]);

  const fetchActiveMissions = useCallback(async () => {
    try {
      const response = await missionsAPI.getMissions();
      // Include all missions for comprehensive monitoring
      const monitorableMissions = response.data.filter(mission => 
        ['planned', 'in_progress', 'paused', 'completed', 'aborted', 'failed'].includes(mission.status)
      );
      setMissions(monitorableMissions);
    } catch (error) {
      console.error('Failed to fetch missions:', error);
      toast.error('Failed to fetch missions');
    }
  }, []);

  const fetchMissionDetails = useCallback(async (missionId) => {
    try {
      const response = await missionsAPI.getMission(missionId);
      const mission = response.data;
      
      // Handle different mission states - no waypoint generation needed
      setMissionDetails(mission);
    } catch (error) {
      console.error('Failed to fetch mission details:', error);
      toast.error('Failed to fetch mission details');
    }
  }, []);

  const updateMissionProgress = useCallback(async (missionId, progressData) => {
    try {
      await missionsAPI.updateProgress(missionId, progressData);
      await fetchMissionDetails(missionId);
      toast.success('Mission progress updated');
    } catch (error) {
      console.error('Failed to update mission progress:', error);
      toast.error('Failed to update mission progress');
    }
  }, [fetchMissionDetails]);

  useEffect(() => {
    fetchActiveMissions();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchActiveMissions();
      if (selectedMission) {
        fetchMissionDetails(selectedMission.id);
        simulateRealTimeData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedMission, fetchActiveMissions, fetchMissionDetails, simulateRealTimeData]);

  // Simulate automatic progress updates for active missions
  useEffect(() => {
    if (selectedMission && selectedMission.status === 'in_progress') {
      const progressInterval = setInterval(() => {
        const currentProgress = selectedMission.progress_percentage;
        if (currentProgress < 100) {
          const newProgress = Math.min(100, currentProgress + Math.random() * 3);
          const newDistance = selectedMission.distance_covered + Math.random() * 150;
          
          updateMissionProgress(selectedMission.id, {
            progress_percentage: newProgress,
            distance_covered: newDistance
          });
        }
      }, 12000);

      return () => clearInterval(progressInterval);
    }
  }, [selectedMission, updateMissionProgress]);

  const handleMissionSelect = useCallback((mission) => {
    setSelectedMission(mission);
    fetchMissionDetails(mission.id);
    // Reset real-time data for new mission
    setRealTimeData({
      battery: 85,
      gpsSignal: 'Strong',
      connectionStatus: 'online',
      currentAction: 'Capturing Images',
      satellites: 12,
      currentPosition: null
    });
  }, [fetchMissionDetails]);

  const handleMissionControl = async (action, missionId) => {
    setLoading(true);
    try {
      let response;
      switch (action) {
        case 'start':
          response = await missionsAPI.startMission(missionId);
          toast.success('Mission started successfully');
          break;
        case 'pause':
          response = await missionsAPI.pauseMission(missionId);
          toast.success('Mission paused');
          break;
        case 'resume':
          response = await missionsAPI.resumeMission(missionId);
          toast.success('Mission resumed');
          break;
        case 'abort':
          response = await missionsAPI.abortMission(missionId);
          toast.success('Mission aborted');
          break;
        default:
          break;
      }
      
      if (response) {
        setSelectedMission(response.data);
        setMissionDetails(response.data);
        fetchActiveMissions();
      }
    } catch (error) {
      toast.error(`Failed to ${action} mission`);
    } finally {
      setLoading(false);
    }
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

  const getPolygonColor = (status) => {
    const colors = {
      'planned': '#6c757d',
      'in_progress': '#28a745',
      'paused': '#ffc107',
      'completed': '#17a2b8',
      'aborted': '#dc3545',
      'failed': '#dc3545'
    };
    return colors[status] || '#667eea';
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const calculateETA = (mission) => {
    if (!mission.started_at || ['completed', 'aborted', 'failed'].includes(mission.status)) return 'N/A';
    
    const startTime = new Date(mission.started_at);
    const now = new Date();
    const elapsed = (now - startTime) / (1000 * 60);
    const estimatedTotal = mission.estimated_duration || 30;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    return formatDuration(Math.ceil(remaining));
  };

  const getBatteryColor = (level) => {
    if (level > 60) return '#28a745';
    if (level > 30) return '#ffc107';
    return '#dc3545';
  };

  const getSignalStrength = (satellites) => {
    if (satellites >= 12) return { text: 'Excellent', color: '#28a745' };
    if (satellites >= 8) return { text: 'Good', color: '#ffc107' };
    if (satellites >= 4) return { text: 'Fair', color: '#fd7e14' };
    return { text: 'Poor', color: '#dc3545' };
  };

  // Filter missions based on status
  const filteredMissions = missions.filter(mission => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ['in_progress', 'paused'].includes(mission.status);
    return mission.status === statusFilter;
  });

  const handleEditMission = (mission) => {
    setEditingMission(mission);
    setEditFormData({
      name: mission.name,
      description: mission.description,
      flight_altitude: mission.flight_altitude,
      flight_speed: mission.flight_speed,
      overlap_percentage: mission.overlap_percentage
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMission) return;
    
    setLoading(true);
    try {
      await missionsAPI.updateMission(editingMission.id, editFormData);
      toast.success('Mission updated successfully');
      setEditingMission(null);
      fetchActiveMissions();
      if (selectedMission?.id === editingMission.id) {
        fetchMissionDetails(editingMission.id);
      }
    } catch (error) {
      toast.error('Failed to update mission');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMission(null);
    setEditFormData({
      name: '',
      description: '',
      flight_altitude: 50,
      flight_speed: 5.0,
      overlap_percentage: 70
    });
  };

  return (
    <div className="mission-monitor">
      <div className="monitor-header">
        <h2>Mission Monitor</h2>
        <p>Real-time monitoring and control of drone missions with survey area visualization</p>
      </div>

      <div className="monitor-content">
        <div className="monitor-sidebar">
          <div className="active-missions">
            <div className="missions-header">
              <h3>Missions ({filteredMissions.length})</h3>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Missions</option>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="aborted">Aborted/Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div className="mission-list">
              {filteredMissions.map(mission => (
                <div
                  key={mission.id}
                  className={`mission-card ${selectedMission?.id === mission.id ? 'selected' : ''} ${mission.status}`}
                  onClick={() => handleMissionSelect(mission)}
                >
                  <div className="mission-header">
                    <h4>{mission.name}</h4>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(mission.status) }}
                    >
                      {mission.status === 'aborted' ? 'Cancelled' : mission.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="mission-info">
                    <div className="info-row">
                      <span>Type:</span>
                      <span>{mission.mission_type}</span>
                    </div>
                    <div className="info-row">
                      <span>Progress:</span>
                      <span>{mission.progress_percentage.toFixed(1)}%</span>
                    </div>
                    <div className="info-row">
                      <span>ETA:</span>
                      <span>{calculateETA(mission)}</span>
                    </div>
                    {mission.status === 'aborted' && (
                      <div className="info-row">
                        <span>Cancelled:</span>
                        <span>{new Date(mission.completed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {mission.status === 'completed' && (
                      <div className="info-row">
                        <span>Completed:</span>
                        <span>{new Date(mission.completed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${mission.progress_percentage}%` }}
                    />
                  </div>
                  
                  {mission.status === 'planned' && (
                    <div className="planned-indicator">
                      <span>📋 Ready to Start</span>
                    </div>
                  )}
                  
                  {mission.status === 'aborted' && (
                    <div className="aborted-indicator">
                      <span>❌ Mission Cancelled</span>
                    </div>
                  )}
                  
                  {mission.status === 'completed' && (
                    <div className="completed-indicator">
                      <span>✅ Mission Completed</span>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredMissions.length === 0 && (
                <div className="no-missions">
                  <p>No missions found for selected filter</p>
                </div>
              )}
            </div>
          </div>

          {selectedMission && (
            <div className="mission-controls">
              <h3>Mission Controls</h3>
              
              <div className="control-buttons">
                {selectedMission.status === 'planned' && (
                  <>
                    <button
                      onClick={() => handleMissionControl('start', selectedMission.id)}
                      disabled={loading}
                      className="btn-success"
                    >
                      <span>🚀</span> Start Mission
                    </button>
                    <button
                      onClick={() => handleEditMission(selectedMission)}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      <span>✏️</span> Edit Mission
                    </button>
                  </>
                )}
                
                {selectedMission.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => handleMissionControl('pause', selectedMission.id)}
                      disabled={loading}
                      className="btn-warning"
                    >
                      <span>⏸️</span> Pause Mission
                    </button>
                    <button
                      onClick={() => handleMissionControl('abort', selectedMission.id)}
                      disabled={loading}
                      className="btn-danger"
                    >
                      <span>❌</span> Cancel Mission
                    </button>
                  </>
                )}
                
                {selectedMission.status === 'paused' && (
                  <>
                    <button
                      onClick={() => handleMissionControl('resume', selectedMission.id)}
                      disabled={loading}
                      className="btn-success"
                    >
                      <span>▶️</span> Resume Mission
                    </button>
                    <button
                      onClick={() => handleMissionControl('abort', selectedMission.id)}
                      disabled={loading}
                      className="btn-danger"
                    >
                      <span>❌</span> Cancel Mission
                    </button>
                  </>
                )}
                
                {(selectedMission.status === 'aborted' || selectedMission.status === 'completed') && (
                  <div className="mission-actions">
                    <button
                      onClick={() => console.log('Restart mission')}
                      disabled={loading}
                      className="btn-primary"
                    >
                      <span>🔄</span> Restart Mission
                    </button>
                    <button
                      onClick={() => console.log('Clone mission')}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      <span>📋</span> Clone Mission
                    </button>
                  </div>
                )}
              </div>

              {selectedMission.status === 'in_progress' && (
                <div className="manual-controls">
                  <h4>Manual Controls</h4>
                  <button
                    onClick={() => updateMissionProgress(selectedMission.id, {
                      progress_percentage: Math.min(100, selectedMission.progress_percentage + 10),
                      distance_covered: selectedMission.distance_covered + 200
                    })}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    <span>⚡</span> Advance Progress (+10%)
                  </button>
                </div>
              )}

              {missionDetails && (
                <div className="mission-stats">
                  <h4>Mission Statistics</h4>
                  
                  <div className="stat-grid">
                    <div className="stat-item">
                      <label>Altitude</label>
                      <value>{missionDetails.flight_altitude}m</value>
                    </div>
                    <div className="stat-item">
                      <label>Speed</label>
                      <value>{missionDetails.flight_speed} m/s</value>
                    </div>
                    <div className="stat-item">
                      <label>Distance</label>
                      <value>{(missionDetails.distance_covered / 1000).toFixed(2)} km</value>
                    </div>
                    <div className="stat-item">
                      <label>Survey Area</label>
                      <value>{missionDetails.survey_area?.properties?.area_name || 'Defined'}</value>
                    </div>
                  </div>
                  
                  {/* Additional info for aborted/failed missions */}
                  {['aborted', 'failed'].includes(selectedMission.status) && (
                    <div className="mission-status-info">
                      <div className="status-message">
                        <span className="status-icon">
                          {selectedMission.status === 'aborted' ? '❌' : '⚠️'}
                        </span>
                        <div className="status-text">
                          <strong>
                            {selectedMission.status === 'aborted' ? 'Mission Cancelled' : 'Mission Failed'}
                          </strong>
                          <p>
                            {selectedMission.status === 'aborted' 
                              ? 'This mission was manually cancelled. Survey area is shown for reference.'
                              : 'This mission encountered an error and was terminated.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="monitor-map">
          {missionDetails ? (
            <MapContainer
              center={[12.9716, 77.5946]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Survey Area as Polygon - Main Feature */}
              {missionDetails.survey_area && 
               missionDetails.survey_area.coordinates && 
               missionDetails.survey_area.coordinates.length > 0 && (
                <Polygon
                  positions={missionDetails.survey_area.coordinates[0].map(coord => [coord[1], coord[0]])}
                  pathOptions={{
                    color: getPolygonColor(selectedMission.status),
                    fillColor: getPolygonColor(selectedMission.status),
                    fillOpacity: ['aborted', 'failed'].includes(selectedMission.status) ? 0.2 : 0.3,
                    weight: 3,
                    opacity: ['aborted', 'failed'].includes(selectedMission.status) ? 0.6 : 1,
                    dashArray: ['aborted', 'failed'].includes(selectedMission.status) ? '10, 5' : undefined
                  }}
                >
                  <Popup>
                    <div className="survey-area-popup">
                      <strong>{missionDetails.survey_area.properties?.area_name || 'Survey Area'}</strong><br/>
                      <div className="popup-info">
                        <div>Mission: <span className="popup-value">{missionDetails.name}</span></div>
                        <div>Type: <span className="popup-value">{missionDetails.mission_type}</span></div>
                        <div>Pattern: <span className="popup-value">{missionDetails.survey_area.properties?.pattern_type || 'Grid'}</span></div>
                        <div>Status: <span className={`popup-status ${selectedMission.status}`}>
                          {selectedMission.status === 'aborted' ? 'Cancelled' : selectedMission.status.replace('_', ' ')}
                        </span></div>
                        <div>Progress: <span className="popup-value">{selectedMission.progress_percentage.toFixed(1)}%</span></div>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              )}
              
              {/* Current Drone Position for active missions */}
              {realTimeData.currentPosition && selectedMission.status === 'in_progress' && (
                <Marker
                  position={realTimeData.currentPosition}
                  icon={createDroneIcon()}
                >
                  <Popup>
                    <div className="drone-popup">
                      <strong>🚁 {selectedMission.name}</strong><br/>
                      <div className="popup-info">
                        <div>Battery: <span className="popup-value">{Math.round(realTimeData.battery)}%</span></div>
                        <div>Action: <span className="popup-value">{realTimeData.currentAction}</span></div>
                        <div>Satellites: <span className="popup-value">{realTimeData.satellites}</span></div>
                        <div>Status: <span className="popup-status online">Flying</span></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div className="map-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon">🗺️</span>
                <h3>Select a mission to view survey area</h3>
                <p>Choose a mission from the list to see the survey area polygon and mission details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Real-time telemetry panel */}
      {selectedMission && (
        <div className="telemetry-panel">
          <h3>Real-time Telemetry</h3>
          <div className="telemetry-grid">
            <div className="telemetry-item">
              <label>Battery Level</label>
              <div className="battery-indicator">
                <div 
                  className="battery-fill"
                  style={{ 
                    width: `${realTimeData.battery}%`,
                    backgroundColor: getBatteryColor(realTimeData.battery)
                  }}
                />
                <span>{Math.round(realTimeData.battery)}%</span>
              </div>
            </div>
            <div className="telemetry-item">
              <label>GPS Signal</label>
              <span 
                className="signal-strength"
                style={{ color: getSignalStrength(realTimeData.satellites).color }}
              >
                {getSignalStrength(realTimeData.satellites).text} ({realTimeData.satellites} satellites)
              </span>
            </div>
            <div className="telemetry-item">
              <label>Connection</label>
              <span className={`connection-status ${realTimeData.connectionStatus}`}>
                {realTimeData.connectionStatus === 'online' ? '🟢 Online' : 
                 realTimeData.connectionStatus === 'reconnecting' ? '🟡 Reconnecting' : '🔴 Offline'}
              </span>
            </div>
            <div className="telemetry-item">
              <label>Current Action</label>
              <span className="current-action">{realTimeData.currentAction}</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mission Modal */}
      {editingMission && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Edit Mission: {editingMission.name}</h3>
              <button
                onClick={handleCancelEdit}
                className="close-button"
                type="button"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <form className="edit-mission-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-mission-name">Mission Name</label>
                    <input
                      id="edit-mission-name"
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      placeholder="Enter mission name"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-description">Description</label>
                    <textarea
                      id="edit-description"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                      placeholder="Mission description"
                      rows="3"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-altitude">Flight Altitude (m)</label>
                    <input
                      id="edit-altitude"
                      type="number"
                      value={editFormData.flight_altitude}
                      onChange={(e) => setEditFormData({...editFormData, flight_altitude: parseFloat(e.target.value)})}
                      min="10"
                      max="120"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-speed">Flight Speed (m/s)</label>
                    <input
                      id="edit-speed"
                      type="number"
                      step="0.1"
                      value={editFormData.flight_speed}
                      onChange={(e) => setEditFormData({...editFormData, flight_speed: parseFloat(e.target.value)})}
                      min="1"
                      max="15"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-overlap">Overlap Percentage (%)</label>
                    <input
                      id="edit-overlap"
                      type="number"
                      value={editFormData.overlap_percentage}
                      onChange={(e) => setEditFormData({...editFormData, overlap_percentage: parseInt(e.target.value)})}
                      min="50"
                      max="90"
                    />
                  </div>
                </div>
              </form>
              
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionMonitor;
