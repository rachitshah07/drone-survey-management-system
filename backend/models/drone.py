from . import db
from datetime import datetime
from enum import Enum

class DroneStatus(Enum):
    AVAILABLE = "available"
    IN_MISSION = "in_mission"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"

class Drone(db.Model):
    __tablename__ = 'drones'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    serial_number = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.Enum(DroneStatus), default=DroneStatus.AVAILABLE)
    battery_level = db.Column(db.Integer, default=100)
    location_lat = db.Column(db.Float)
    location_lng = db.Column(db.Float)
    altitude = db.Column(db.Float, default=0)
    max_flight_time = db.Column(db.Integer, default=30)  # minutes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    missions = db.relationship('Mission', backref='drone', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'model': self.model,
            'serial_number': self.serial_number,
            'status': self.status.value,
            'battery_level': self.battery_level,
            'location': {
                'lat': self.location_lat,
                'lng': self.location_lng,
                'altitude': self.altitude
            },
            'max_flight_time': self.max_flight_time,
            'created_at': self.created_at.isoformat(),
            'last_seen': self.last_seen.isoformat()
        }
