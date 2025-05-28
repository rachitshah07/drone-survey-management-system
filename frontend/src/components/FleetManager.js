import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { dronesAPI } from '../services/api';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';

const FleetManager = () => {
  const [drones, setDrones] = useState([]);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [droneStats, setDroneStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddDrone, setShowAddDrone] = useState(false);
  const [newDrone, setNewDrone] = useState({
    name: '',
    model: '',
    serial_number: '',
    max_flight_time: 30
  });
  
  // Ref for modal content to handle scroll
  const modalRef = useRef();
  const addDroneFormRef = useRef();

  useEffect(() => {
    fetchDrones();
    fetchDroneStats();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchDrones();
      fetchDroneStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handle body scroll when modal is open
  useEffect(() => {
    if (showAddDrone) {
      document.body.style.overflow = 'hidden';
      // Scroll to form when modal opens
      setTimeout(() => {
        addDroneFormRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddDrone]);

  const fetchDrones = async () => {
    try {
      const response = await dronesAPI.getDrones();
      setDrones(response.data);
    } catch (error) {
      console.error('Failed to fetch drones:', error);
    }
  };

  const fetchDroneStats = async () => {
    try {
      const response = await dronesAPI.getStats();
      setDroneStats(response.data);
    } catch (error) {
      console.error('Failed to fetch drone stats:', error);
    }
  };

  const handleAddDrone = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        console.log("NEW DRONE", newDrone);
      await dronesAPI.createDrone(newDrone);
      toast.success('Drone added successfully');
      setShowAddDrone(false);
      setNewDrone({
        name: '',
        model: '',
        serial_number: '',
        max_flight_time: 30
      });
      fetchDrones();
      fetchDroneStats();
    } catch (error) {
        const error_message = error.response.data.message;
        // console.error(error_message);
        toast.error(error_message);
    
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDrone = async (droneId, updateData) => {
    try {
      await dronesAPI.updateDrone(droneId, updateData);
      toast.success('Drone updated successfully');
      fetchDrones();
    } catch (error) {
      toast.error('Failed to update drone');
    }
  };

  const handleDeleteDrone = async (droneId) => {
    if (window.confirm('Are you sure you want to delete this drone?')) {
      try {
        await dronesAPI.deleteDrone(droneId);
        toast.success('Drone deleted successfully');
        setSelectedDrone(null);
        fetchDrones();
        fetchDroneStats();
      } catch (error) {
        toast.error('Failed to delete drone');
      }
    }
  };

  // Handle click outside modal to close
  const handleModalClick = (e) => {
    if (modalRef.current && e.target === modalRef.current) {
      setShowAddDrone(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'available': '#28a745',
      'in_mission': '#ffc107',
      'maintenance': '#fd7e14',
      'offline': '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const getBatteryColor = (level) => {
    if (level > 60) return '#28a745';
    if (level > 30) return '#ffc107';
    return '#dc3545';
  };

  const formatLastSeen = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fleet-manager">
      <div className="fleet-header">
        <h2>Fleet Management</h2>
        <p>Monitor and manage your drone fleet in real-time</p>
        
        <button
          onClick={() => setShowAddDrone(true)}
          className="btn-primary add-drone-btn"
        >
          <span className="btn-icon">➕</span>
          Add New Drone
        </button>
      </div>

      {/* Fleet Statistics */}
      <div className="fleet-stats">
        <div className="stat-card">
          <div className="stat-icon available">
            <span>✈️</span>
          </div>
          <div className="stat-content">
            <h3>{droneStats.total || 0}</h3>
            <p>Total Drones</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon available">
            <span>🟢</span>
          </div>
          <div className="stat-content">
            <h3>{droneStats.available || 0}</h3>
            <p>Available</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon in-mission">
            <span>🟡</span>
          </div>
          <div className="stat-content">
            <h3>{droneStats.in_mission || 0}</h3>
            <p>In Mission</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon maintenance">
            <span>🔧</span>
          </div>
          <div className="stat-content">
            <h3>{droneStats.maintenance || 0}</h3>
            <p>Maintenance</p>
          </div>
        </div>
      </div>

      <div className="fleet-content">
        <div className="fleet-list">
          <h3>Drone Fleet</h3>
          
          <div className="drone-grid">
            {drones.map(drone => (
              <div
                key={drone.id}
                className={`drone-card ${selectedDrone?.id === drone.id ? 'selected' : ''}`}
                onClick={() => setSelectedDrone(drone)}
              >
                <div className="drone-header">
                  <h4>{drone.name}</h4>
                  <span 
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(drone.status) }}
                  />
                </div>
                
                <div className="drone-info">
                  <div className="info-row">
                    <span>Model:</span>
                    <span>{drone.model}</span>
                  </div>
                  <div className="info-row">
                    <span>Serial:</span>
                    <span>{drone.serial_number}</span>
                  </div>
                  <div className="info-row">
                    <span>Status:</span>
                    <span className={`status ${drone.status}`}>
                      {drone.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="battery-section">
                  <div className="battery-label">
                    <span>Battery</span>
                    <span>{drone.battery_level}%</span>
                  </div>
                  <div className="battery-bar">
                    <div 
                      className="battery-fill"
                      style={{ 
                        width: `${drone.battery_level}%`,
                        backgroundColor: getBatteryColor(drone.battery_level)
                      }}
                    />
                  </div>
                </div>

                <div className="drone-footer">
                  <small>Last seen: {formatLastSeen(drone.last_seen)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fleet-details">
          {selectedDrone ? (
            <div className="drone-details">
              <div className="details-header">
                <h3>{selectedDrone.name}</h3>
                <div className="detail-actions">
                  <button
                    onClick={() => handleUpdateDrone(selectedDrone.id, {
                      status: selectedDrone.status === 'available' ? 'maintenance' : 'available'
                    })}
                    className="btn-secondary"
                  >
                    Toggle Maintenance
                  </button>
                  <button
                    onClick={() => handleDeleteDrone(selectedDrone.id)}
                    className="btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="details-content">
                <div className="detail-section">
                  <h4>Basic Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Model</label>
                      <span>{selectedDrone.model}</span>
                    </div>
                    <div className="detail-item">
                      <label>Serial Number</label>
                      <span>{selectedDrone.serial_number}</span>
                    </div>
                    <div className="detail-item">
                      <label>Max Flight Time</label>
                      <span>{selectedDrone.max_flight_time} minutes</span>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <span className={`status ${selectedDrone.status}`}>
                        {selectedDrone.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Current Status</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Battery Level</label>
                      <div className="battery-display">
                        <div className="battery-bar">
                          <div 
                            className="battery-fill"
                            style={{ 
                              width: `${selectedDrone.battery_level}%`,
                              backgroundColor: getBatteryColor(selectedDrone.battery_level)
                            }}
                          />
                        </div>
                        <span>{selectedDrone.battery_level}%</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <label>Location</label>
                      <span>
                        {selectedDrone.location?.lat && selectedDrone.location?.lng
                          ? `${selectedDrone.location.lat.toFixed(6)}, ${selectedDrone.location.lng.toFixed(6)}`
                          : 'Unknown'
                        }
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Altitude</label>
                      <span>{selectedDrone.location?.altitude || 0}m</span>
                    </div>
                    <div className="detail-item">
                      <label>Last Seen</label>
                      <span>{formatLastSeen(selectedDrone.last_seen)}</span>
                    </div>
                  </div>
                </div>

                {/* Map showing drone location */}
                {selectedDrone.location?.lat && selectedDrone.location?.lng && (
                  <div className="detail-section">
                    <h4>Current Location</h4>
                    <div className="drone-map">
                      <MapContainer
                        center={[selectedDrone.location.lat, selectedDrone.location.lng]}
                        zoom={15}
                        style={{ height: '300px', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[selectedDrone.location.lat, selectedDrone.location.lng]}>
                          <Popup>
                            <div>
                              <strong>{selectedDrone.name}</strong><br/>
                              Status: {selectedDrone.status}<br/>
                              Battery: {selectedDrone.battery_level}%<br/>
                              Altitude: {selectedDrone.location.altitude}m
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <div className="no-selection-content">
                <span className="no-selection-icon">🚁</span>
                <h3>Select a drone to view details</h3>
                <p>Click on any drone from the fleet list to see detailed information, location, and management options.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Drone Modal - Fixed Implementation */}
      {showAddDrone && (
        <div 
          className="modal-overlay"
          ref={modalRef}
          onClick={handleModalClick}
        >
          <div className="modal-container">
            <div className="modal-header">
              <h3>Add New Drone to Fleet</h3>
              <button
                onClick={() => setShowAddDrone(false)}
                className="close-button"
                type="button"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content" ref={addDroneFormRef}>
              <form onSubmit={handleAddDrone} className="drone-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="drone-name">Drone Name *</label>
                    <input
                      id="drone-name"
                      type="text"
                      value={newDrone.name}
                      onChange={(e) => setNewDrone({...newDrone, name: e.target.value})}
                      placeholder="e.g., Survey Drone Alpha"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="drone-model">Model *</label>
                    <input
                      id="drone-model"
                      type="text"
                      value={newDrone.model}
                      onChange={(e) => setNewDrone({...newDrone, model: e.target.value})}
                      placeholder="e.g., DJI Phantom 4 Pro"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="serial-number">Serial Number *</label>
                    <input
                      id="serial-number"
                      type="text"
                      value={newDrone.serial_number}
                      onChange={(e) => setNewDrone({...newDrone, serial_number: e.target.value})}
                      placeholder="e.g., FB-2025-001"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="flight-time">Max Flight Time (minutes) *</label>
                    <input
                      id="flight-time"
                      type="number"
                      value={newDrone.max_flight_time}
                      onChange={(e) => setNewDrone({...newDrone, max_flight_time: parseInt(e.target.value)})}
                      min="10"
                      max="120"
                      required
                    />
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowAddDrone(false)}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Adding Drone...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">➕</span>
                        Add Drone
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManager;
