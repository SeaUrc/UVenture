from flask import Blueprint, request, jsonify
from database import get_supabase_client

auth_bp = Blueprint('auth', __name__)

# Get Supabase client
supabase = get_supabase_client()

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Supabase auth sign in
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        return jsonify({
            'message': 'Login successful',
            'user': response.user.model_dump() if response.user else None,
            'session': response.session.model_dump() if response.session else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Supabase auth sign up
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        return jsonify({
            'message': 'Registration successful',
            'user': response.user.model_dump() if response.user else None
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        supabase.auth.sign_out()
        return jsonify({'message': 'Logout successful'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400
