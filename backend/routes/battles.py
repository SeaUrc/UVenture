from flask import Blueprint, request, jsonify
from database import get_supabase_client

battles_bp = Blueprint('battles', __name__)

# Get Supabase client
supabase = get_supabase_client()

@battles_bp.route('/', methods=['GET'])
def get_battles():
    """Get all battles"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        response = supabase.table('battles').select('*').execute()
        return jsonify({
            'battles': response.data,
            'count': len(response.data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@battles_bp.route('/<int:battle_id>', methods=['GET'])
def get_battle(battle_id):
    """Get specific battle by ID"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        response = supabase.table('battles').select('*').eq('id', battle_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Battle not found'}), 404
            
        return jsonify({
            'battle': response.data[0]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@battles_bp.route('/', methods=['POST'])
def create_battle():
    """Create a new battle"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        
        required_fields = ['challenger_id', 'location_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Add default battle status
        data['status'] = 'pending'
        data['created_at'] = 'now()'
        
        response = supabase.table('battles').insert(data).execute()
        
        return jsonify({
            'message': 'Battle created successfully',
            'battle': response.data[0] if response.data else None
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@battles_bp.route('/<int:battle_id>/join', methods=['POST'])
def join_battle(battle_id):
    """Join an existing battle"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        # Update battle with opponent
        response = supabase.table('battles').update({
            'opponent_id': user_id,
            'status': 'active'
        }).eq('id', battle_id).execute()
        
        return jsonify({
            'message': 'Successfully joined battle',
            'battle': response.data[0] if response.data else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@battles_bp.route('/<int:battle_id>/result', methods=['POST'])
def submit_battle_result(battle_id):
    """Submit battle result"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        winner_id = data.get('winner_id')
        
        if not winner_id:
            return jsonify({'error': 'winner_id is required'}), 400
        
        response = supabase.table('battles').update({
            'winner_id': winner_id,
            'status': 'completed',
            'completed_at': 'now()'
        }).eq('id', battle_id).execute()
        
        return jsonify({
            'message': 'Battle result submitted successfully',
            'battle': response.data[0] if response.data else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
