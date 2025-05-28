from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask import jsonify
from models.user import User

def admin_required(f):
    """
    This decorator is used to restrict a route to only be accessible by 
    users with the admin flag set to True. If the user is not an admin, 
    a 403 status code will be returned with a message indicating that 
    admin access is required.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin:
            return jsonify({'message': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        return f(*args, **kwargs)
    return decorated_function
