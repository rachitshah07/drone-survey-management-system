import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import { dronesAPI, missionsAPI } from '../services/api';
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

// Custom waypoint icon
const createWaypointIcon = (sequence) => {
  return L.divIcon({
    html: `<div style="
      background: #667eea;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: 12px;
    ">${sequence}</div>`,
    className: 'custom-waypoint-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

const MissionPlanner = () => {
  const [drones, setDrones] = useState([]);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [missionData, setMissionData] = useState({
    name: '',
    description: '',
    mission_type: 'survey',
    flight_altitude: 50,
    flight_speed: 5.0,
    overlap_percentage: 70
  });
  const [surveyArea, setSurveyArea] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAreaComplete, setIsAreaComplete] = useState(false);

  useEffect(() => {
    fetchAvailableDrones();
  }, []);

  // Validate survey area completion
  const validateSurveyArea = useCallback(() => {
    const isComplete = surveyArea.length > 0 && surveyArea[0] && surveyArea[0].length >= 3;
    setIsAreaComplete(isComplete);
    return isComplete;
  }, [surveyArea]);

  useEffect(() => {
    validateSurveyArea();
  }, [surveyArea, validateSurveyArea]);

  const fetchAvailableDrones = async () => {
    try {
      const response = await dronesAPI.getDrones();
      const availableDrones = response.data.filter(drone => drone.status === 'available');
      setDrones(availableDrones);
    } catch (error) {
      toast.error('Failed to fetch available drones');
    }
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (isDrawingArea) {
          const newPoint = [e.latlng.lat, e.latlng.lng];
          setCurrentPolygon(prev => [...prev, newPoint]);
        }
      }
    });
    return null;
  };

  const startDrawingArea = () => {
    setIsDrawingArea(true);
    setCurrentPolygon([]);
    toast.info('Click on the map to define survey area points');
  };

  const finishDrawingArea = () => {
    if (currentPolygon.length >= 3) {
      setSurveyArea([currentPolygon]);
      generateWaypoints(currentPolygon);
      setIsDrawingArea(false);
      setCurrentPolygon([]);
      toast.success('Survey area defined successfully');
    } else {
      toast.error('Please define at least 3 points for the survey area');
    }
  };

  const clearArea = () => {
    setSurveyArea([]);
    setWaypoints([]);
    setCurrentPolygon([]);
    setIsDrawingArea(false);
    setIsAreaComplete(false);
    toast.info('Survey area cleared');
  };

  const generateWaypoints = (polygon) => {
    // Generate grid pattern waypoints based on survey area
    const bounds = getBounds(polygon);
    const gridSpacing = calculateGridSpacing(bounds, missionData.overlap_percentage);
    const generatedWaypoints = [];

    let sequence = 1;
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += gridSpacing.lat) {
      const isEvenRow = Math.floor((lat - bounds.minLat) / gridSpacing.lat) % 2 === 0;
      
      if (isEvenRow) {
        // Left to right
        for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += gridSpacing.lng) {
          if (isPointInPolygon([lat, lng], polygon)) {
            generatedWaypoints.push({
              sequence: sequence++,
              coordinates: [lng, lat, missionData.flight_altitude],
              action: 'capture',
              speed: missionData.flight_speed,
              heading: 90,
              gimbal_pitch: -90
            });
          }
        }
      } else {
        // Right to left (crosshatch pattern)
        for (let lng = bounds.maxLng; lng >= bounds.minLng; lng -= gridSpacing.lng) {
          if (isPointInPolygon([lat, lng], polygon)) {
            generatedWaypoints.push({
              sequence: sequence++,
              coordinates: [lng, lat, missionData.flight_altitude],
              action: 'capture',
              speed: missionData.flight_speed,
              heading: 270,
              gimbal_pitch: -90
            });
          }
        }
      }
    }

    // Add takeoff and landing waypoints
    if (generatedWaypoints.length > 0) {
      const takeoffPoint = polygon[0];
      const landingPoint = polygon[0];

      const finalWaypoints = [
        {
          sequence: 0,
          coordinates: [takeoffPoint[1], takeoffPoint[0], missionData.flight_altitude],
          action: 'takeoff',
          speed: 3.0,
          heading: 0
        },
        ...generatedWaypoints,
        {
          sequence: sequence,
          coordinates: [landingPoint[1], landingPoint[0], 0],
          action: 'land',
          speed: 2.0,
          heading: 0
        }
      ];

      setWaypoints(finalWaypoints);
    }
  };

  const getBounds = (polygon) => {
    const lats = polygon.map(point => point[0]);
    const lngs = polygon.map(point => point[1]);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  };

  const calculateGridSpacing = (bounds, overlapPercentage) => {
    const areaWidth = bounds.maxLng - bounds.minLng;
    const areaHeight = bounds.maxLat - bounds.minLat;
    const overlapFactor = (100 - overlapPercentage) / 100;
    
    return {
      lat: (areaHeight / 10) * overlapFactor,
      lng: (areaWidth / 10) * overlapFactor
    };
  };

  const isPointInPolygon = (point, polygon) => {
    const [lat, lng] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDrone) {
      toast.error('Please select a drone');
      return;
    }
    
    if (!isAreaComplete) {
      toast.error('Please define a complete survey area');
      return;
    }

    if (!missionData.name.trim()) {
      toast.error('Please enter a mission name');
      return;
    }

    setLoading(true);
    
    try {
      const missionPayload = {
        ...missionData,
        drone_id: selectedDrone.id,
        survey_area: {
          type: 'Polygon',
          coordinates: surveyArea,
          properties: {
            area_name: missionData.name,
            pattern_type: 'crosshatch'
          }
        },
        waypoints: {
          flight_plan: {
            pattern_type: 'crosshatch',
            total_waypoints: waypoints.length,
            estimated_flight_time: Math.ceil(waypoints.length * 0.5)
          },
          waypoints: waypoints
        },
        estimated_duration: Math.ceil(waypoints.length * 0.5)
      };

      await missionsAPI.createMission(missionPayload);
      toast.success('Mission created successfully!');
      
      // Reset form
      setMissionData({
        name: '',
        description: '',
        mission_type: 'survey',
        flight_altitude: 50,
        flight_speed: 5.0,
        overlap_percentage: 70
      });
      setSurveyArea([]);
      setWaypoints([]);
      setSelectedDrone(null);
      setIsAreaComplete(false);
      
    } catch (error) {
      toast.error('Failed to create mission');
    } finally {
      setLoading(false);
    }
  };

  const getButtonState = () => {
    if (loading) return { disabled: true, text: 'Creating Mission...', class: 'btn-loading' };
    if (!selectedDrone) return { disabled: true, text: 'Select a Drone First', class: 'btn-disabled' };
    if (!isAreaComplete) return { disabled: true, text: 'Complete Survey Area', class: 'btn-disabled' };
    if (!missionData.name.trim()) return { disabled: true, text: 'Enter Mission Name', class: 'btn-disabled' };
    return { disabled: false, text: 'Create Mission', class: 'btn-primary' };
  };

  const buttonState = getButtonState();

  return (
    <div className="mission-planner">
      <div className="planner-header">
        <h2>Mission Planner</h2>
        <p>Plan and configure autonomous drone survey missions</p>
      </div>

      <div className="planner-content">
        <div className="planner-sidebar">
          <form onSubmit={handleSubmit} className="mission-form">
            <div className="form-section">
              <h3>Mission Details</h3>
              
              <div className="form-group">
                <label>Mission Name *</label>
                <input
                  type="text"
                  value={missionData.name}
                  onChange={(e) => setMissionData({...missionData, name: e.target.value})}
                  placeholder="Enter mission name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={missionData.description}
                  onChange={(e) => setMissionData({...missionData, description: e.target.value})}
                  placeholder="Mission description"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Mission Type</label>
                <select
                  value={missionData.mission_type}
                  onChange={(e) => setMissionData({...missionData, mission_type: e.target.value})}
                >
                  <option value="survey">Survey</option>
                  <option value="inspection">Inspection</option>
                  <option value="mapping">Mapping</option>
                  <option value="security_patrol">Security Patrol</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <h3>Flight Parameters</h3>
              
              <div className="form-group">
                <label>Flight Altitude (m)</label>
                <input
                  type="number"
                  value={missionData.flight_altitude}
                  onChange={(e) => {
                    const newAltitude = parseFloat(e.target.value);
                    setMissionData({...missionData, flight_altitude: newAltitude});
                    // Regenerate waypoints if area exists
                    if (surveyArea.length > 0) {
                      generateWaypoints(surveyArea[0]);
                    }
                  }}
                  min="10"
                  max="120"
                />
              </div>

              <div className="form-group">
                <label>Flight Speed (m/s)</label>
                <input
                  type="number"
                  step="0.1"
                  value={missionData.flight_speed}
                  onChange={(e) => {
                    const newSpeed = parseFloat(e.target.value);
                    setMissionData({...missionData, flight_speed: newSpeed});
                    // Regenerate waypoints if area exists
                    if (surveyArea.length > 0) {
                      generateWaypoints(surveyArea[0]);
                    }
                  }}
                  min="1"
                  max="15"
                />
              </div>

              <div className="form-group">
                <label>Overlap Percentage (%)</label>
                <input
                  type="number"
                  value={missionData.overlap_percentage}
                  onChange={(e) => {
                    const newOverlap = parseInt(e.target.value);
                    setMissionData({...missionData, overlap_percentage: newOverlap});
                    // Regenerate waypoints if area exists
                    if (surveyArea.length > 0) {
                      generateWaypoints(surveyArea[0]);
                    }
                  }}
                  min="50"
                  max="90"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Drone Selection</h3>
              
              {drones.length === 0 ? (
                <div className="no-drones">
                  <p>No available drones found</p>
                  <button
                    type="button"
                    onClick={fetchAvailableDrones}
                    className="btn-secondary"
                  >
                    Refresh Drones
                  </button>
                </div>
              ) : (
                <div className="drone-list">
                  {drones.map(drone => (
                    <div
                      key={drone.id}
                      className={`drone-card ${selectedDrone?.id === drone.id ? 'selected' : ''}`}
                      onClick={() => setSelectedDrone(drone)}
                    >
                      <div className="drone-info">
                        <strong>{drone.name}</strong>
                        <span>{drone.model}</span>
                        <div className="drone-stats">
                          <span>Battery: {drone.battery_level}%</span>
                          <span className={`status ${drone.status}`}>{drone.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-section">
              <h3>Survey Area</h3>
              
              <div className="area-controls">
                {!isDrawingArea && surveyArea.length === 0 && (
                  <button
                    type="button"
                    onClick={startDrawingArea}
                    className="btn-secondary"
                  >
                    Draw Survey Area
                  </button>
                )}
                
                {isDrawingArea && (
                  <>
                    <div className="drawing-instructions">
                      <p>Click on the map to add points. Minimum 3 points required.</p>
                      <p>Current points: {currentPolygon.length}</p>
                    </div>
                    <button
                      type="button"
                      onClick={finishDrawingArea}
                      disabled={currentPolygon.length < 3}
                      className="btn-primary"
                    >
                      Finish Area ({currentPolygon.length} points)
                    </button>
                  </>
                )}
                
                {surveyArea.length > 0 && (
                  <button
                    type="button"
                    onClick={clearArea}
                    className="btn-danger"
                  >
                    Clear Area
                  </button>
                )}
              </div>

              {waypoints.length > 0 && (
                <div className="waypoint-info">
                  <p><strong>Waypoints Generated:</strong> {waypoints.length}</p>
                  <p><strong>Estimated Flight Time:</strong> {Math.ceil(waypoints.length * 0.5)} minutes</p>
                  <p><strong>Survey Area:</strong> {isAreaComplete ? '✅ Complete' : '⚠️ Incomplete'}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={buttonState.disabled}
              className={`btn-large ${buttonState.class}`}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  {buttonState.text}
                </>
              ) : (
                <>
                  <span>🚀</span>
                  {buttonState.text}
                </>
              )}
            </button>
          </form>
        </div>

        <div className="planner-map">
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <MapClickHandler />
            
            {/* Current drawing polygon */}
            {currentPolygon.length > 0 && (
              <Polygon
                positions={currentPolygon}
                pathOptions={{ 
                  color: '#667eea', 
                  fillOpacity: 0.2,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              />
            )}
            
            {/* Survey area */}
            {surveyArea.length > 0 && (
              <Polygon
                positions={surveyArea[0]}
                pathOptions={{ 
                  color: '#28a745', 
                  fillOpacity: 0.3,
                  weight: 3
                }}
              >
                <Popup>
                  <div>
                    <strong>Survey Area</strong><br/>
                    Points: {surveyArea[0].length}<br/>
                    Waypoints: {waypoints.length}<br/>
                    Est. Time: {Math.ceil(waypoints.length * 0.5)} min
                  </div>
                </Popup>
              </Polygon>
            )}
            
            {/* Waypoints */}
            {waypoints.map((waypoint, index) => (
              <Marker
                key={index}
                position={[waypoint.coordinates[1], waypoint.coordinates[0]]}
                icon={createWaypointIcon(waypoint.sequence)}
              >
                <Popup>
                  <div>
                    <strong>Waypoint {waypoint.sequence}</strong><br/>
                    Action: {waypoint.action}<br/>
                    Altitude: {waypoint.coordinates[2]}m<br/>
                    Speed: {waypoint.speed} m/s<br/>
                    Heading: {waypoint.heading}°
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default MissionPlanner;
