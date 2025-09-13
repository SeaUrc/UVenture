import os
import threading
import time
from datetime import datetime
from flask import Flask, jsonify, request
from dotenv import load_dotenv
from database import get_supabase_client

# Import blueprints
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.locations import locations_bp
from routes.battles import battles_bp
from routes.teams import teams_bp

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get Supabase client from shared database module
supabase = get_supabase_client()

def award_location_points():
    """Background task to award points to teams based on location ownership"""
    while True:
        try:
            if not supabase:
                print(f"[{datetime.now()}] Warning: Supabase not configured, skipping point award")
                time.sleep(600)  # Wait 10 minutes
                continue
            
            print(f"[{datetime.now()}] Starting location points award cycle...")
            
            # Get all locations with owner teams
            locations_response = supabase.table('locations').select(
                'owner_team, owner_count'
            ).not_.is_('owner_team', 'null').execute()
            
            if not locations_response.data:
                print(f"[{datetime.now()}] No locations with owners found")
                time.sleep(600)  # Wait 10 minutes
                continue
            
            # Calculate points to award to each team
            team_points = {}
            for location in locations_response.data:
                owner_team = location.get('owner_team')
                owner_count = location.get('owner_count', 0)
                
                if owner_team and owner_count > 0:
                    if owner_team not in team_points:
                        team_points[owner_team] = 0
                    team_points[owner_team] += owner_count
            
            # Award points to each team
            points_awarded = 0
            for team_id, points in team_points.items():
                try:
                    # Get current team points
                    current_response = supabase.table('teams').select('points').eq('id', team_id).execute()
                    
                    if current_response.data:
                        current_points = current_response.data[0].get('points', 0)
                        new_points = current_points + points
                        
                        # Update team points
                        update_response = supabase.table('teams').update({
                            'points': new_points
                        }).eq('id', team_id).execute()
                        
                        if update_response.data:
                            points_awarded += points
                            print(f"[{datetime.now()}] Awarded {points} points to team {team_id} (total: {new_points})")
                        else:
                            print(f"[{datetime.now()}] Failed to update points for team {team_id}")
                    else:
                        print(f"[{datetime.now()}] Team {team_id} not found in database")
                        
                except Exception as e:
                    print(f"[{datetime.now()}] Error updating points for team {team_id}: {str(e)}")
            
            print(f"[{datetime.now()}] Points award cycle completed. Total points awarded: {points_awarded}")
            
        except Exception as e:
            print(f"[{datetime.now()}] Error in location points award task: {str(e)}")
        
        # Wait 10 minutes (600 seconds) before next cycle
        time.sleep(600)

def start_background_tasks():
    """Start background tasks in separate threads"""
    print(f"[{datetime.now()}] Starting background tasks...")
    
    # Start location points award task
    points_thread = threading.Thread(target=award_location_points, daemon=True)
    points_thread.start()
    print(f"[{datetime.now()}] Location points award task started")

# Register blueprints with /api prefix
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(profile_bp, url_prefix='/api/profile')
app.register_blueprint(locations_bp, url_prefix='/api/locations')
app.register_blueprint(battles_bp, url_prefix='/api/battles')
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
            'battles': '/api/battles',
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
        'api_version': '1.0.0',
        'background_tasks': {
            'location_points_award': 'running'
        }
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
    # Start background tasks
    start_background_tasks()
    
    # Start Flask app
    print(f"[{datetime.now()}] Starting Flask server...")
    app.run(debug=True, host='127.0.0.1', port=5001)

