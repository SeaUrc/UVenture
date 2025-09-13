from flask import Blueprint, request, jsonify
from database import get_supabase_client

locations_bp = Blueprint('locations', __name__)

# Get Supabase client
supabase = get_supabase_client()

@locations_bp.route('/', methods=['GET'])
def get_locations():
    """Get all locations"""
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500
    
    try:
        response = supabase.table('locations').select('*').execute()
        return jsonify({
            'locations': response.data,
            'count': len(response.data)
        })
        
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
