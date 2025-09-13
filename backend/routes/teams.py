from flask import Blueprint, request, jsonify
from database import get_supabase_client

teams_bp = Blueprint('teams', __name__)

# Get Supabase client
supabase = get_supabase_client()

@teams_bp.route('/get_teams', methods=['GET'])
def get_teams():
    """Get all teams with member counts"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        # Get all teams
        teams_response = supabase.table('teams').select('id, name, color, points').execute()
        teams = teams_response.data
        
        # Get all users to count members per team
        users_response = supabase.table('users').select('team').execute()
        users = users_response.data
        
        # Count members for each team
        team_member_counts = {}
        for user in users:
            team_id = user.get('team')
            if team_id is not None:
                team_member_counts[team_id] = team_member_counts.get(team_id, 0) + 1
        
        # Add member count to each team
        for team in teams:
            team_id = team['id']
            team['members'] = team_member_counts.get(team_id, 0)
        
        print(teams)
        return jsonify({
            'data': teams
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/get_team', methods=['POST'])
def get_team():
    """Get a specific team by ID"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        # Get team ID from request body
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        team_id = data.get('id')
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