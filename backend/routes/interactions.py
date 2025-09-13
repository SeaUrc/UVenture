import os
import jwt
from functools import wraps
from flask import Blueprint, request, jsonify, g
from datetime import datetime
from database import get_supabase_client

interactions_bp = Blueprint('interactions', __name__)

# Get Supabase client
supabase = get_supabase_client()

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

@interactions_bp.route('/battle', methods=['POST'])
@require_auth
def battle():
    """Start and end battle at some location, will change ownership if you win"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        location_id = data.get('id')
        score = data.get('score')
        user_id = g.user_id
        
        # Validate input
        if location_id is None:
            return jsonify({'error': 'Location ID is required'}), 400
        if score is None:
            return jsonify({'error': 'Score is required'}), 400
        if not isinstance(location_id, int):
            return jsonify({'error': 'Location ID must be an integer'}), 400
        if not isinstance(score, int):
            return jsonify({'error': 'Score must be an integer'}), 400
        
        # Get user information (team and strength)
        user_response = supabase.table('users').select('team, strength').eq('id', user_id).execute()
        if not user_response.data:
            return jsonify({'error': 'User not found'}), 404
        
        user = user_response.data[0]
        user_team = user.get('team')
        user_strength = user.get('strength', 0)
        
        if not user_team:
            return jsonify({'error': 'User must be assigned to a team to battle'}), 400
        
        # Get location information
        location_response = supabase.table('locations').select('*').eq('id', location_id).execute()
        if not location_response.data:
            return jsonify({'error': 'Location not found'}), 404
        
        location = location_response.data[0]
        current_owner_team = location.get('owner_team')
        current_strongest_owner_id = location.get('strongest_owner_id')
        
        # Check if user's team already owns the location
        if current_owner_team == user_team:
            return jsonify({'error': 'Your team already owns this location'}), 400
        
        # Get the strength of the strongest owner to use as battle threshold
        battle_threshold = 0
        if current_strongest_owner_id:
            strongest_response = supabase.table('users').select('strength').eq('id', current_strongest_owner_id).execute()
            if strongest_response.data:
                battle_threshold = strongest_response.data[0].get('strength', 0)
        
        # Calculate battle result based on score and user strength vs strongest owner's strength
        total_power = score + user_strength
        
        # Determine if user wins
        wins = total_power > battle_threshold
        
        # Update user's last_battle timestamp regardless of outcome
        supabase.table('users').update({
            'last_battle': datetime.utcnow().isoformat()
        }).eq('id', user_id).execute()
        
        if wins:
            # Team ownership change - set new team as owner and reset ownership
            update_data = {
                'owner_team': user_team,
                'owner_count': 1,
                'owned_since': datetime.utcnow().isoformat(),
                'strongest_owner_id': user_id
            }
            
            # Apply location updates
            supabase.table('locations').update(update_data).eq('id', location_id).execute()
            
            return jsonify({'message': 'win'}), 200
        else:
            return jsonify({'message': 'lose'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@interactions_bp.route('/become_owner', methods=['POST'])
@require_auth
def become_owner():
    """Join your team's group of owners at a location"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        location_id = data.get('id')
        user_id = g.user_id
        
        # Validate input
        if location_id is None:
            return jsonify({'error': 'Location ID is required'}), 400
        if not isinstance(location_id, int):
            return jsonify({'error': 'Location ID must be an integer'}), 400
        
        # Get user information
        user_response = supabase.table('users').select('team, strength').eq('id', user_id).execute()
        if not user_response.data:
            return jsonify({'error': 'User not found'}), 404
        
        user = user_response.data[0]
        user_team = user.get('team')
        user_strength = user.get('strength', 0)
        
        if not user_team:
            return jsonify({'error': 'User must be assigned to a team'}), 400
        
        # Get location information
        location_response = supabase.table('locations').select('owner_team, owner_count, strongest_owner_id').eq('id', location_id).execute()
        if not location_response.data:
            return jsonify({'error': 'Location not found'}), 404
        
        location = location_response.data[0]
        location_owner_team = location.get('owner_team')
        current_owner_count = location.get('owner_count', 0)
        current_strongest_owner_id = location.get('strongest_owner_id')
        
        # Check if user's team owns the location
        if location_owner_team != user_team:
            return jsonify({'error': 'Your team does not own this location'}), 403
        
        # Increment owner count (assuming this represents the user joining as an owner)
        new_owner_count = current_owner_count + 1
        
        # Update location data
        update_data = {
            'owner_count': new_owner_count
        }
        
        # Check if this user should become the strongest owner
        if current_strongest_owner_id:
            # Get current strongest owner's strength
            strongest_response = supabase.table('users').select('strength').eq('id', current_strongest_owner_id).execute()
            if strongest_response.data:
                current_strongest_strength = strongest_response.data[0].get('strength', 0)
                if user_strength > current_strongest_strength:
                    update_data['strongest_owner_id'] = user_id
        else:
            # No current strongest owner, set this user
            update_data['strongest_owner_id'] = user_id
        
        # Update the location
        supabase.table('locations').update(update_data).eq('id', location_id).execute()
        
        return '', 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
