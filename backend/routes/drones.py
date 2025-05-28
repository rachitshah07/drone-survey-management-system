from models.user import User
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.drone import Drone, DroneStatus
from utils.auth import admin_required, auth_required
from datetime import datetime

drones_bp = Blueprint('drones', __name__)

@drones_bp.route('/', methods=['GET'])
@auth_required
def get_drones():
    drones = Drone.query.all()
    return jsonify([drone.to_dict() for drone in drones]), 200

@drones_bp.route('/<int:drone_id>', methods=['GET'])
@auth_required
def get_drone(drone_id):
    drone = Drone.query.get_or_404(drone_id)
    return jsonify(drone.to_dict()), 200

@drones_bp.route('/', methods=['POST'], strict_slashes=False)
@admin_required
def create_drone():
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        if not user.is_admin:
            return jsonify({'message': 'Admin access required to create drones'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'model', 'serial_number']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'Missing required field: {field}'}), 422
        
        # Check if serial number already exists
        existing_drone = Drone.query.filter_by(serial_number=data['serial_number']).first()
        if existing_drone:
            return jsonify({'message': 'Drone with this serial number already exists'}), 422
        
        drone = Drone(
            name=data['name'],
            model=data['model'],
            serial_number=data['serial_number'],
            max_flight_time=data.get('max_flight_time', 30)
        )
        
        db.session.add(drone)
        db.session.commit()
        
        return jsonify(drone.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error creating drone: {str(e)}'}), 500
@drones_bp.route('/<int:drone_id>', methods=['PUT'])
@admin_required
def update_drone(drone_id):
    drone = Drone.query.get_or_404(drone_id)
    data = request.get_json()
    
    drone.name = data.get('name', drone.name)
    drone.model = data.get('model', drone.model)
    drone.status = DroneStatus(data.get('status', drone.status.value))
    drone.battery_level = data.get('battery_level', drone.battery_level)
    drone.location_lat = data.get('location_lat', drone.location_lat)
    drone.location_lng = data.get('location_lng', drone.location_lng)
    drone.altitude = data.get('altitude', drone.altitude)
    drone.last_seen = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(drone.to_dict()), 200

@drones_bp.route('/<int:drone_id>', methods=['DELETE'])
@admin_required
def delete_drone(drone_id):
    drone = Drone.query.get_or_404(drone_id)
    db.session.delete(drone)
    db.session.commit()
    
    return jsonify({'message': 'Drone deleted successfully'}), 200

@drones_bp.route('/stats', methods=['GET'])
@auth_required
def get_drone_stats():
    total_drones = Drone.query.count()
    available_drones = Drone.query.filter_by(status=DroneStatus.AVAILABLE).count()
    in_mission_drones = Drone.query.filter_by(status=DroneStatus.IN_MISSION).count()
    maintenance_drones = Drone.query.filter_by(status=DroneStatus.MAINTENANCE).count()
    
    return jsonify({
        'total': total_drones,
        'available': available_drones,
        'in_mission': in_mission_drones,
        'maintenance': maintenance_drones
    }), 200
