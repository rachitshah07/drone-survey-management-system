from . import db
from datetime import datetime
from enum import Enum
import json

class MissionStatus(Enum):
    PLANNED = "planned"
    STARTING = "starting"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    ABORTED = "aborted"
    FAILED = "failed"

class MissionType(Enum):
    INSPECTION = "inspection"
    MAPPING = "mapping"
    SECURITY_PATROL = "security_patrol"
    SURVEY = "survey"

class Mission(db.Model):
    __tablename__ = 'missions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    mission_type = db.Column(db.Enum(MissionType), nullable=False)
    status = db.Column(db.Enum(MissionStatus), default=MissionStatus.PLANNED)
    
    # Mission Parameters
    flight_altitude = db.Column(db.Float, default=50.0)  # meters
    flight_speed = db.Column(db.Float, default=5.0)  # m/s
    overlap_percentage = db.Column(db.Integer, default=70)
    
    # Survey Area (stored as JSON)
    survey_area = db.Column(db.Text)  # JSON string of coordinates
    waypoints = db.Column(db.Text)  # JSON string of waypoint coordinates
    
    # Progress Tracking
    progress_percentage = db.Column(db.Float, default=0.0)
    estimated_duration = db.Column(db.Integer)  # minutes
    actual_duration = db.Column(db.Integer)  # minutes
    distance_covered = db.Column(db.Float, default=0.0)  # meters
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Foreign Keys
    drone_id = db.Column(db.Integer, db.ForeignKey('drones.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    def set_survey_area(self, coordinates):
        self.survey_area = json.dumps(coordinates)
    
    def get_survey_area(self):
        return json.loads(self.survey_area) if self.survey_area else []
    
    def set_waypoints(self, waypoints):
        self.waypoints = json.dumps(waypoints)
    
    def get_waypoints(self):
        return json.loads(self.waypoints) if self.waypoints else []
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'mission_type': self.mission_type.value,
            'status': self.status.value,
            'flight_altitude': self.flight_altitude,
            'flight_speed': self.flight_speed,
            'overlap_percentage': self.overlap_percentage,
            'survey_area': self.get_survey_area(),
            'waypoints': self.get_waypoints(),
            'progress_percentage': self.progress_percentage,
            'estimated_duration': self.estimated_duration,
            'actual_duration': self.actual_duration,
            'distance_covered': self.distance_covered,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'drone_id': self.drone_id,
            'user_id': self.user_id
        }
