import os
import jwt
from functools import wraps
from flask import Blueprint, request, jsonify, g
from database import get_supabase_client

profile_bp = Blueprint('profile', __name__)

# Get Supabase client
supabase = get_supabase_client()

with open("./routes/default_pfp.txt", "r") as file:
    DEFAULT_PFP = file.read().strip()

def require_auth(f):
    """Decorator to require authentication for endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization header required'}), 401
        
        try:
            # Extract token from "Bearer <token>" format
            if not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Invalid authorization header format'}), 401
            
            token = auth_header.split(' ')[1]
            secret_key = os.getenv('JWT_SECRET_KEY')
            
            if not secret_key:
                return jsonify({'error': 'JWT secret not configured'}), 500
            
            # Decode and verify JWT token
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                return jsonify({'error': 'Invalid token payload'}), 401
            
            # Add user_id to request context
            g.user_id = user_id
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
    
    return decorated_function

@profile_bp.route('/set_picture', methods=['POST'])
@require_auth
def set_picture():
    """Set the profile picture of the authenticated user"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        image = data.get('image')
        if not image:
            return jsonify({'error': 'Image data is required'}), 400
        
        user_id = g.user_id
        
        # Update user's profile picture in the database
        response = supabase.table('users').update({
            'image': image
        }).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to update profile picture'}), 500
        
        return jsonify({}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/remove_picture', methods=['POST'])
@require_auth
def remove_picture():
    """Remove the profile picture of the authenticated user"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        user_id = g.user_id
        
        # Set profile picture to null/default
        response = supabase.table('users').update({
            'image': DEFAULT_PFP
        }).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to remove profile picture'}), 500
        
        return jsonify({}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/set_team', methods=['POST'])
@require_auth
def set_team():
    """Set the team of the authenticated user"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        team = data.get('team')
        if team is None:
            return jsonify({'error': 'Team ID is required'}), 400
        
        if not isinstance(team, int):
            return jsonify({'error': 'Team ID must be an integer'}), 400
        
        user_id = g.user_id
        
        # Update user's team in the database
        response = supabase.table('users').update({
            'team': team
        }).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to update team'}), 500
        
        return jsonify({}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/get_profile', methods=['GET'])
def get_profile():
    """Get the profile of a user by ID"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_id = data.get('id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        if not isinstance(user_id, int):
            return jsonify({'error': 'User ID must be an integer'}), 400
        
        # Get user profile from database (excluding password_hash for security)
        response = supabase.table('users').select(
            'username, team, image, strength'
        ).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'error': 'User not found'}), 404
        
        user = response.data[0]
        
        return jsonify({
            'username': user.get('username'),
            'team': user.get('team'),
            'image': user.get('image'),
            'strength': user.get('strength')
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

