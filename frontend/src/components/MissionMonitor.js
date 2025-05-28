import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Circle } from 'react-leaflet';
import { missionsAPI } from '../services/api';
import { toast } from 'react-toastify';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

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
  const [realTimeData, setRealTimeData] = useState({
    battery: 85,
    gpsSignal: 'Strong',
    connectionStatus: 'online',
    currentAction: 'Scanning Area',
    satellites: 11,
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

  // Helper function to check if mission should show drone position
  const shouldShowDronePosition = (mission) => {
    return mission && ['in_progress', 'paused'].includes(mission.status);
  };

  // Helper function to check if mission is inactive (completed/aborted)
  const isInactiveMission = (mission) => {
    return mission && ['completed', 'aborted', 'failed'].includes(mission.status);
  };

  // Dynamic helper function to detect coordinate format and get center
  const getSurveyAreaCenter = (surveyArea) => {
    if (!surveyArea || !surveyArea.coordinates || !surveyArea.coordinates[0]) {
      return [12.9716, 77.5946]; // Default fallback
    }

    try {
      const coords = surveyArea.coordinates[0];
      
      // Auto-detect coordinate format by checking value ranges
      let lats, lngs;
      
      // Check if first coordinate looks like latitude (typically -90 to 90)
      const firstCoord = coords[0];
      if (Math.abs(firstCoord[0]) <= 90 && Math.abs(firstCoord[1]) > 90) {
        // Format: [lat, lng]
        lats = coords.map(coord => coord[0]);
        lngs = coords.map(coord => coord[1]);
      } else if (Math.abs(firstCoord[1]) <= 90 && Math.abs(firstCoord[0]) > 90) {
        // Format: [lng, lat] (GeoJSON standard)
        lats = coords.map(coord => coord[1]);
        lngs = coords.map(coord => coord[0]);
      } else {
        // Fallback: assume [lat, lng] if both are in valid ranges
        lats = coords.map(coord => coord[0]);
        lngs = coords.map(coord => coord[1]);
      }
      
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      
      return [centerLat, centerLng];
    } catch (error) {
      console.error('Error calculating survey area center:', error);
      return [12.9716, 77.5946]; // Fallback
    }
  };

  // Dynamic survey area polygon conversion
  const getSurveyAreaPolygon = (surveyArea) => {
    if (!surveyArea || !surveyArea.coordinates || !Array.isArray(surveyArea.coordinates)) {
      return null;
    }

    try {
      let coordinates;
      
      // Handle different GeoJSON structures
      if (surveyArea.type === 'Polygon' && surveyArea.coordinates.length > 0) {
        coordinates = surveyArea.coordinates[0];
      } else if (Array.isArray(surveyArea.coordinates[0]) && Array.isArray(surveyArea.coordinates[0][0])) {
        coordinates = surveyArea.coordinates[0];
      } else {
        coordinates = surveyArea.coordinates;
      }

      // Auto-detect coordinate format and convert to [lat, lng] for Leaflet
      const leafletCoords = coordinates.map(coord => {
        if (Array.isArray(coord) && coord.length >= 2) {
          // Auto-detect format by checking value ranges
          if (Math.abs(coord[0]) <= 90 && Math.abs(coord[1]) > 90) {
            // Format: [lat, lng] - use as is
            return [coord[0], coord[1]];
          } else if (Math.abs(coord[1]) <= 90 && Math.abs(coord[0]) > 90) {
            // Format: [lng, lat] - swap to [lat, lng]
            return [coord[1], coord[0]];
          } else {
            // Both values in lat range or ambiguous - assume [lat, lng]
            return [coord[0], coord[1]];
          }
        }
        return coord;
      });

      return leafletCoords;
    } catch (error) {
      console.error('Error converting survey area:', error);
      return null;
    }
  };

  // Dynamic random position generation within any survey area (only for active missions)
  const generateRandomPositionInBounds = (coords) => {
    try {
      let lats, lngs;
      
      // Auto-detect coordinate format
      const firstCoord = coords[0];
      if (Math.abs(firstCoord[0]) <= 90 && Math.abs(firstCoord[1]) > 90) {
        // Format: [lat, lng]
        lats = coords.map(coord => coord[0]);
        lngs = coords.map(coord => coord[1]);
      } else if (Math.abs(firstCoord[1]) <= 90 && Math.abs(firstCoord[0]) > 90) {
        // Format: [lng, lat]
        lats = coords.map(coord => coord[1]);
        lngs = coords.map(coord => coord[0]);
      } else {
        // Fallback: assume [lat, lng]
        lats = coords.map(coord => coord[0]);
        lngs = coords.map(coord => coord[1]);
      }
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Generate random position within bounds with bias towards center
      const latRange = maxLat - minLat;
      const lngRange = maxLng - minLng;
      
      // Use controlled random factors to keep drone movement realistic
      const randomLatFactor = 0.2 + (Math.random() * 0.6); // 0.2 to 0.8 range
      const randomLngFactor = 0.2 + (Math.random() * 0.6); // 0.2 to 0.8 range
      
      const randomLat = minLat + (randomLatFactor * latRange);
      const randomLng = minLng + (randomLngFactor * lngRange);
      
      return [randomLat, randomLng];
    } catch (error) {
      console.error('Error generating random position:', error);
      return [12.9716, 77.5946]; // Fallback
    }
  };

  // Enhanced real-time data simulation - only for active missions
  const simulateRealTimeData = useCallback(() => {
    setRealTimeData(prev => {
      let newPosition = prev.currentPosition;
      
      // Only simulate movement for ACTIVE missions (in_progress, paused)
      if (selectedMission && 
          shouldShowDronePosition(selectedMission) && 
          missionDetails?.survey_area) {
        
        const surveyArea = missionDetails.survey_area;
        if (surveyArea.coordinates && surveyArea.coordinates.length > 0) {
          const coords = surveyArea.coordinates[0];
          newPosition = generateRandomPositionInBounds(coords);
        }
      } else {
        // For inactive missions, clear drone position
        newPosition = null;
      }
      
      return {
        ...prev,
        battery: Math.max(15, prev.battery - (Math.random() * 0.3)), // Realistic battery drain
        satellites: 8 + Math.floor(Math.random() * 7), // 8-14 satellites
        currentAction: getRandomAction(),
        connectionStatus: Math.random() > 0.97 ? 'reconnecting' : 'online',
        currentPosition: newPosition
      };
    });
  }, [getRandomAction, selectedMission, missionDetails]);

  const fetchActiveMissions = useCallback(async () => {
    try {
      const response = await missionsAPI.getMissions();
      // Support all mission statuses dynamically
      const monitorableMissions = response.data.filter(mission => 
        mission && mission.id && mission.status
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
    
    // Set up real-time updates only for active missions
    const interval = setInterval(() => {
      fetchActiveMissions();
      if (selectedMission && shouldShowDronePosition(selectedMission)) {
        simulateRealTimeData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedMission, fetchActiveMissions, simulateRealTimeData]);

  const handleMissionSelect = useCallback((mission) => {
    setSelectedMission(mission);
    fetchMissionDetails(mission.id);
    
    // Reset real-time data based on mission status
    if (shouldShowDronePosition(mission)) {
      setRealTimeData({
        battery: 85,
        gpsSignal: 'Strong',
        connectionStatus: 'online',
        currentAction: 'Scanning Area',
        satellites: 11,
        currentPosition: null
      });
    } else {
      // For inactive missions, clear telemetry data
      setRealTimeData({
        battery: 0,
        gpsSignal: 'N/A',
        connectionStatus: 'offline',
        currentAction: 'Mission Completed',
        satellites: 0,
        currentPosition: null
      });
    }
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

  // Dynamic status color mapping
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

  // Get polygon style based on mission status
  const getPolygonStyle = (status) => {
    const baseStyle = {
      color: getPolygonColor(status),
      fillColor: getPolygonColor(status),
      weight: 3,
    };

    if (['completed', 'aborted', 'failed'].includes(status)) {
      // Inactive missions: reference style
      return {
        ...baseStyle,
        fillOpacity: 0.15,
        opacity: 0.7,
        dashArray: status === 'completed' ? '5, 10, 5' : '10, 5', // Different dash patterns
      };
    } else {
      // Active missions: normal style
      return {
        ...baseStyle,
        fillOpacity: 0.3,
        opacity: 1,
      };
    }
  };

  // Dynamic formatting functions
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

  // Dynamic mission filtering
  const filteredMissions = missions.filter(mission => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ['in_progress', 'paused'].includes(mission.status);
    return mission.status === statusFilter;
  });

  // Dynamic zoom calculation based on survey area size
  const calculateOptimalZoom = (surveyArea) => {
    if (!surveyArea || !surveyArea.coordinates || !surveyArea.coordinates[0]) {
      return 15; // Default zoom
    }

    try {
      const coords = surveyArea.coordinates[0];
      let lats, lngs;
      
      // Auto-detect coordinate format
      const firstCoord = coords[0];
      if (Math.abs(firstCoord[0]) <= 90 && Math.abs(firstCoord[1]) > 90) {
        lats = coords.map(coord => coord[0]);
        lngs = coords.map(coord => coord[1]);
      } else {
        lats = coords.map(coord => coord[1]);
        lngs = coords.map(coord => coord[0]);
      }
      
      const latRange = Math.max(...lats) - Math.min(...lats);
      const lngRange = Math.max(...lngs) - Math.min(...lngs);
      const maxRange = Math.max(latRange, lngRange);
      
      // Calculate zoom based on area size
      if (maxRange > 0.1) return 10;      // Very large area
      if (maxRange > 0.05) return 12;     // Large area
      if (maxRange > 0.01) return 14;     // Medium area
      if (maxRange > 0.005) return 16;    // Small area
      return 18;                          // Very small area
    } catch (error) {
      console.error('Error calculating zoom:', error);
      return 15;
    }
  };

  return (
    <div className="mission-monitor">
      <div className="monitor-header">
        <h2>Mission Monitor</h2>
        <p>Real-time monitoring and control of drone missions with dynamic survey area visualization</p>
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
              
              {/* Show controls only for active missions */}
              {shouldShowDronePosition(selectedMission) && (
                <div className="control-buttons">
                  {selectedMission.status === 'planned' && (
                    <button
                      onClick={() => handleMissionControl('start', selectedMission.id)}
                      disabled={loading}
                      className="btn-success"
                    >
                      <span>🚀</span> Start Mission
                    </button>
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
                </div>
              )}
              {/* // Add this button in your mission controls section */}
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

              {/* Show reference message for inactive missions */}
              {isInactiveMission(selectedMission) && (
                <div className="mission-reference-info">
                  <div className="reference-message">
                    <span className="reference-icon">
                      {selectedMission.status === 'completed' ? '✅' : '❌'}
                    </span>
                    <div className="reference-text">
                      <strong>
                        {selectedMission.status === 'completed' ? 'Mission Completed' : 'Mission Cancelled'}
                      </strong>
                      <p>Survey area shown for reference only. No active drone operations.</p>
                    </div>
                  </div>
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
                </div>
              )}
            </div>
          )}
        </div>

        <div className="monitor-map">
          {missionDetails ? (
            <MapContainer
              center={getSurveyAreaCenter(missionDetails.survey_area)}
              zoom={calculateOptimalZoom(missionDetails.survey_area)}
              style={{ height: '100%', width: '100%' }}
              key={`${selectedMission.id}-${missionDetails.survey_area ? 'with-area' : 'no-area'}`}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Dynamic Survey Area Polygon - Always show for reference */}
              {missionDetails.survey_area && (() => {
                const polygonCoords = getSurveyAreaPolygon(missionDetails.survey_area);
                
                if (polygonCoords && polygonCoords.length > 0) {
                  return (
                    <Polygon
                      positions={polygonCoords}
                      pathOptions={getPolygonStyle(selectedMission.status)}
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
                            {isInactiveMission(selectedMission) && (
                              <div><em>Reference only - Mission {selectedMission.status}</em></div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Polygon>
                  );
                }
                return null;
              })()}
              
              {/* Dynamic Drone Position - Only for active missions */}
              {realTimeData.currentPosition && shouldShowDronePosition(selectedMission) && (
                <>
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
                  
                  <Circle
                    center={realTimeData.currentPosition}
                    radius={25}
                    pathOptions={{
                      color: '#007bff',
                      fillColor: '#007bff',
                      fillOpacity: 0.1,
                      weight: 1
                    }}
                  />
                </>
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

      {/* Enhanced Real-time telemetry panel - Only for active missions */}
      {selectedMission && shouldShowDronePosition(selectedMission) && (
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
    </div>
  );
};

export default MissionMonitor;
