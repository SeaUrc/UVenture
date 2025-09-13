import os
import jwt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_supabase_client

auth_bp = Blueprint('auth', __name__)

# Get Supabase client
supabase = get_supabase_client()

def generate_jwt_token(user_id):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=24),  # Token expires in 24 hours
        'iat': datetime.utcnow()
    }
    
    secret_key = os.getenv('JWT_SECRET_KEY')
    if not secret_key:
        raise ValueError("JWT_SECRET_KEY not found in environment variables")
    
    return jwt.encode(payload, secret_key, algorithm='HS256')

@auth_bp.route('/create_account', methods=['POST'])
def create_account():
    """Create a new user account"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username')
        password = data.get('password')
        team = data.get('team')  # Optional team ID
        image = data.get('image')  # Optional base64 image string
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Validate team ID if provided
        if team is not None and not isinstance(team, int):
            return jsonify({'error': 'Team must be an integer'}), 400
        
        # Check if username already exists
        existing_user = supabase.table('users').select('id').eq('username', username).execute()
        if existing_user.data:
            return jsonify({'error': 'Username already exists'}), 409
        
        # Hash the password
        password_hash = generate_password_hash(password)
        
        # Create new user
        user_data = {
            'username': username,
            'password_hash': password_hash,
            'team': team,  # Use provided team ID or None
            'strength': 0,   # Default value
            'image': image  # Use provided base64 image or None
        }
        
        response = supabase.table('users').insert(user_data).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to create account'}), 500
        
        return jsonify({}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/sign_in', methods=['POST'])
def sign_in():
    """Sign in user and return JWT token"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Get user from database
        response = supabase.table('users').select('id, username, password_hash').eq('username', username).execute()
        
        if not response.data:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        user = response.data[0]
        
        # Check password
        if not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Generate JWT token
        token = generate_jwt_token(user['id'])
        
        return jsonify({
            'token': token,
            'id': user['id']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
