from flask import Blueprint, request, jsonify
from database import get_supabase_client

teams_bp = Blueprint('teams', __name__)

# Get Supabase client
supabase = get_supabase_client()

@teams_bp.route('/', methods=['GET'])
def get_teams():
    """Get all teams"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        response = supabase.table('teams').select('*').execute()
        return jsonify({
            'teams': response.data,
            'count': len(response.data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/<int:team_id>', methods=['GET'])
def get_team(team_id):
    """Get specific team by ID"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        response = supabase.table('teams').select('*').eq('id', team_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Team not found'}), 404
            
        return jsonify({
            'team': response.data[0]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/', methods=['POST'])
def create_team():
    """Create a new team"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        
        required_fields = ['name', 'owner_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        response = supabase.table('teams').insert(data).execute()
        
        return jsonify({
            'message': 'Team created successfully',
            'team': response.data[0] if response.data else None
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/<int:team_id>/members', methods=['GET'])
def get_team_members(team_id):
    """Get team members"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        response = supabase.table('team_members').select('*').eq('team_id', team_id).execute()
        
        return jsonify({
            'team_id': team_id,
            'members': response.data,
            'count': len(response.data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/<int:team_id>/join', methods=['POST'])
def join_team(team_id):
    """Join a team"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        # Check if user is already a member
        existing = supabase.table('team_members').select('*').eq('team_id', team_id).eq('user_id', user_id).execute()
        
        if existing.data:
            return jsonify({'error': 'User is already a member of this team'}), 400
        
        # Add user to team
        response = supabase.table('team_members').insert({
            'team_id': team_id,
            'user_id': user_id,
            'role': 'member',
            'joined_at': 'now()'
        }).execute()
        
        return jsonify({
            'message': 'Successfully joined team',
            'membership': response.data[0] if response.data else None
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/<int:team_id>/leave', methods=['POST'])
def leave_team(team_id):
    """Leave a team"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        response = supabase.table('team_members').delete().eq('team_id', team_id).eq('user_id', user_id).execute()
        
        return jsonify({
            'message': 'Successfully left team'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
