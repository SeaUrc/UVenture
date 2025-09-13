import os
from flask import Flask, jsonify, request
from dotenv import load_dotenv
from database import get_supabase_client

# Import blueprints
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.locations import locations_bp
from routes.interactions import interactions_bp
from routes.teams import teams_bp

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get Supabase client from shared database module
supabase = get_supabase_client()

# Register blueprints with /api prefix
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(profile_bp, url_prefix='/api/profile')
app.register_blueprint(locations_bp, url_prefix='/api/locations')
app.register_blueprint(interactions_bp, url_prefix='/api/interactions')
app.register_blueprint(teams_bp, url_prefix='/api/teams')

@app.route('/')
def hello_world():
    return jsonify({
        'message': 'CMUGo API Server',
        'status': 'success',
        'endpoints': {
            'auth': '/api/auth',
            'profile': '/api/profile',
            'locations': '/api/locations',
            'interactions': '/api/interactions',
            'teams': '/api/teams'
        }
    })

@app.route('/health')
def health_check():
    """Health check endpoint"""
    supabase_status = "connected" if supabase else "not configured"
    return jsonify({
        'status': 'healthy',
        'service': 'cmugo-backend',
        'supabase': supabase_status,
        'api_version': '1.0.0'
    })

@app.route('/test-supabase')
def test_supabase():
    """Test Supabase connection"""
    if not supabase:
        return jsonify({'error': 'Supabase not configured'}), 500
    
    try:
        # Simple test query - this will work even if no tables exist
        response = supabase.rpc('version').execute()
        return jsonify({
            'message': 'Supabase connection successful',
            'status': 'connected'
        })
    except Exception as e:
        return jsonify({
            'message': 'Supabase connection test',
            'status': 'error',
            'error': str(e)
        })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)
