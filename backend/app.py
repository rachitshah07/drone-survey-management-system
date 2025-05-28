from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from config import Config
from models import init_db
from routes.auth import auth_bp
from routes.drones import drones_bp
from routes.missions import missions_bp

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, 
         origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],  # ADD X-Requested-With
         supports_credentials=True,
         expose_headers=['Content-Type', 'Authorization'])
    

    app.url_map.strict_slashes = False
    
    
    jwt = JWTManager(app)
    
    
    init_db(app)
    

    @jwt.user_identity_loader
    def user_identity_lookup(user_id):
        """Convert user ID to string for JWT compatibility"""
        print("User ID:", user_id)

        return str(user_id)
    
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """Automatically load user from JWT token"""
        from models.user import User
        identity = int(jwt_data["sub"])  
        return User.query.filter_by(id=identity).one_or_none()
    

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'message': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'message': 'Invalid token'}), 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'message': 'Authorization token is required'}), 401
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(drones_bp, url_prefix='/api/drones')
    app.register_blueprint(missions_bp, url_prefix='/api/missions')

    @app.route('/api/health', methods=['GET'])
    def health_check():
        try:
            from models import db
            db.session.execute(db.text('SELECT 1'))
            return jsonify({
                'status': 'healthy',
                'message': 'AeroSurvey Drone Survey API is running',
                'database': 'connected'
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'message': 'Database connection failed',
                'error': str(e)
            }), 503
    

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'message': 'Internal server error'}), 500

    if app.debug:
        @app.before_request
        def log_request_info():
            app.logger.debug('Request: %s %s', request.method, request.url)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
