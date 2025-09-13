from flask import Blueprint, request, jsonify
from database import get_supabase_client

teams_bp = Blueprint('teams', __name__)

# Get Supabase client
supabase = get_supabase_client()

@teams_bp.route('/get_teams', methods=['GET'])
def get_teams():
    """Get all teams"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        response = supabase.table('teams').select('id, name, color, points').execute()
        return jsonify({
            'data': response.data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/get_team', methods=['GET'])
def get_team():
    """Get a specific team by ID"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        # Get team ID from request args
        team_id = request.args.get('id', type=int)
        if team_id is None:
            return jsonify({'error': 'Team ID is required'}), 400
        if not isinstance(team_id, int):
            return jsonify({'error': 'Team ID must be an integer'}), 400
        
        # Query the specific team
        response = supabase.table('teams').select('id, name, color, points').eq('id', team_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Team not found'}), 404
            
        # Return the single team object
        return jsonify(response.data[0])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500