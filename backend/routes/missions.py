from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.mission import Mission, MissionStatus, MissionType
from models.drone import Drone, DroneStatus
from utils.auth import auth_required
from datetime import datetime

missions_bp = Blueprint('missions', __name__)

@missions_bp.route('/', methods=['GET'])
@auth_required
def get_missions():
    missions = Mission.query.all()
    return jsonify([mission.to_dict() for mission in missions]), 200

@missions_bp.route('/<int:mission_id>', methods=['GET'])
@auth_required
def get_mission(mission_id):
    mission = Mission.query.get_or_404(mission_id)
    return jsonify(mission.to_dict()), 200

@missions_bp.route('/', methods=['POST'])
@auth_required
def create_mission():
    data = request.get_json()
    user_id = get_jwt_identity()

    # Validate drone availability
    drone = Drone.query.get(data['drone_id'])

    print(drone)
    if not drone or drone.status != DroneStatus.AVAILABLE:
        return jsonify({'message': 'Drone not available'}), 400
    
    mission = Mission(
        name=data['name'],
        description=data.get('description', ''),
        mission_type=MissionType(data['mission_type']),
        flight_altitude=data.get('flight_altitude', 50.0),
        flight_speed=data.get('flight_speed', 5.0),
        overlap_percentage=data.get('overlap_percentage', 70),
        estimated_duration=data.get('estimated_duration', 30),
        drone_id=data['drone_id'],
        user_id=user_id
    )
    
    if 'survey_area' in data:
        mission.set_survey_area(data['survey_area'])
    
    if 'waypoints' in data:
        mission.set_waypoints(data['waypoints'])
    
    db.session.add(mission)
    db.session.commit()
    
    return jsonify(mission.to_dict()), 201

@missions_bp.route('/<int:mission_id>/start', methods=['POST'], strict_slashes=False)
@auth_required
def start_mission(mission_id):
    mission = Mission.query.get_or_404(mission_id)
    
    if mission.status != MissionStatus.PLANNED:
        return jsonify({'message': 'Mission cannot be started'}), 400
    
    # Update mission status
    mission.status = MissionStatus.IN_PROGRESS
    mission.started_at = datetime.utcnow()
    
    # Update drone status
    drone = Drone.query.get(mission.drone_id)
    drone.status = DroneStatus.IN_MISSION
    
    db.session.commit()
    
    return jsonify(mission.to_dict()), 200

@missions_bp.route('/<int:mission_id>/pause', methods=['POST'], strict_slashes=False)
@auth_required
def pause_mission(mission_id):
    mission = Mission.query.get_or_404(mission_id)
    
    if mission.status != MissionStatus.IN_PROGRESS:
        return jsonify({'message': 'Mission cannot be paused'}), 400
    
    mission.status = MissionStatus.PAUSED
    db.session.commit()
    
    return jsonify(mission.to_dict()), 200

@missions_bp.route('/<int:mission_id>/resume', methods=['POST'],    strict_slashes=False)
@auth_required
def resume_mission(mission_id):
    mission = Mission.query.get_or_404(mission_id)
    
    if mission.status != MissionStatus.PAUSED:
        return jsonify({'message': 'Mission cannot be resumed'}), 400
    
    mission.status = MissionStatus.IN_PROGRESS
    db.session.commit()
    
    return jsonify(mission.to_dict()), 200

@missions_bp.route('/<int:mission_id>/abort', methods=['POST'], strict_slashes=False)
@auth_required
def abort_mission(mission_id):
    mission = Mission.query.get_or_404(mission_id)
    
    if mission.status in [MissionStatus.COMPLETED, MissionStatus.ABORTED]:
        return jsonify({'message': 'Mission already finished'}), 400
    
    mission.status = MissionStatus.ABORTED
    mission.completed_at = datetime.utcnow()
    
    # Free up the drone
    drone = Drone.query.get(mission.drone_id)
    drone.status = DroneStatus.AVAILABLE
    
    db.session.commit()
    
    return jsonify(mission.to_dict()), 200

@missions_bp.route('/<int:mission_id>/progress', methods=['PUT'], strict_slashes=False)
@auth_required
def update_mission_progress(mission_id):
    mission = Mission.query.get_or_404(mission_id)
    data = request.get_json()
    
    mission.progress_percentage = data.get('progress_percentage', mission.progress_percentage)
    mission.distance_covered = data.get('distance_covered', mission.distance_covered)
    
    # Auto-complete mission if 100% progress
    if mission.progress_percentage >= 100:
        mission.status = MissionStatus.COMPLETED
        mission.completed_at = datetime.utcnow()
        
        # Calculate actual duration
        if mission.started_at:
            duration = datetime.utcnow() - mission.started_at
            mission.actual_duration = int(duration.total_seconds() / 60)
        
        # Free up the drone
        drone = Drone.query.get(mission.drone_id)
        drone.status = DroneStatus.AVAILABLE
    
    db.session.commit()
    
    return jsonify(mission.to_dict()), 200

@missions_bp.route('/stats', methods=['GET'], strict_slashes=False)
@auth_required
def get_mission_stats():
    total_missions = Mission.query.count()
    completed_missions = Mission.query.filter_by(status=MissionStatus.COMPLETED).count()
    active_missions = Mission.query.filter(
        Mission.status.in_([MissionStatus.IN_PROGRESS, MissionStatus.STARTING])
    ).count()
    
    # Calculate total distance covered
    total_distance = db.session.query(db.func.sum(Mission.distance_covered)).scalar() or 0
    
    return jsonify({
        'total_missions': total_missions,
        'completed_missions': completed_missions,
        'active_missions': active_missions,
        'total_distance_covered': total_distance
    }), 200
