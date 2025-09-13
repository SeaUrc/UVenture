from flask import Blueprint, request, jsonify
from database import get_supabase_client

locations_bp = Blueprint('locations', __name__)

# Get Supabase client
supabase = get_supabase_client()

@locations_bp.route('/get_locations', methods=['GET'])
def get_locations():
    """Get all locations with complete information including team details"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        # Get all locations
        locations_response = supabase.table('locations').select('*').execute()
        
        if not locations_response.data:
            return jsonify({'data': []}), 200
        
        # Get all teams for joining
        teams_response = supabase.table('teams').select('id, name, color').execute()
        teams_dict = {team['id']: team for team in teams_response.data} if teams_response.data else {}
        
        # Process each location and add team information
        result_data = []
        for location in locations_response.data:
            location_obj = {
                'id': location.get('id'),
                'name': location.get('name'),
                'image': location.get('image'),
                'latitude': location.get('latitude'),  # Fixed typo from your spec
                'longitude': location.get('longitude'),
                'owner_team': location.get('owner_team'),
                'owner_count': location.get('owner_count'),
                'owned_since': location.get('owned_since'),
                'strongest_owner_id': location.get('strongest_owner_id')
            }
            
            # Add team information if owner_team exists
            owner_team_id = location.get('owner_team')
            if owner_team_id and owner_team_id in teams_dict:
                team_info = teams_dict[owner_team_id]
                location_obj['owner_team_color'] = team_info.get('color')
                location_obj['owner_team_name'] = team_info.get('name')
            else:
                # Default values if no owner team or team not found
                location_obj['owner_team_color'] = None
                location_obj['owner_team_name'] = None
            
            result_data.append(location_obj)
        
        return jsonify({'data': result_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@locations_bp.route('/<int:location_id>', methods=['GET'])
def get_location(location_id):
    """Get specific location by ID"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        response = supabase.table('locations').select('*').eq('id', location_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Location not found'}), 404
            
        return jsonify({
            'location': response.data[0]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@locations_bp.route('/nearby', methods=['POST'])
def get_nearby_locations():
    """Get locations near given coordinates"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        radius = data.get('radius', 1000)  # Default radius in meters
        
        if not latitude or not longitude:
            return jsonify({'error': 'Latitude and longitude required'}), 400
        
        # This would require PostGIS or similar for real geospatial queries
        # For now, return a placeholder response
        return jsonify({
            'message': 'Nearby locations endpoint',
            'latitude': latitude,
            'longitude': longitude,
            'radius': radius,
            'locations': [],
            'note': 'Add geospatial query implementation'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@locations_bp.route('/', methods=['POST'])
def create_location():
    """Create a new location"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        data = request.get_json()
        
        required_fields = ['name', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        response = supabase.table('locations').insert(data).execute()
        
        return jsonify({
            'message': 'Location created successfully',
            'location': response.data[0] if response.data else None
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
