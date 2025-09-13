import os
from flask import Flask, jsonify, request
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None
    print("Warning: Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_KEY in .env file")

@app.route('/')
def hello_world():
    return jsonify({
        'message': 'Hello from CMUGo backend!',
        'status': 'success'
    })

@app.route('/health')
def health_check():
    supabase_status = "connected" if supabase else "not configured"
    return jsonify({
        'status': 'healthy',
        'service': 'cmugo-backend',
        'supabase': supabase_status
    })

@app.route('/users', methods=['GET'])
def get_users():
    """Get all users from Supabase"""
    if not supabase:
        return jsonify({'error': 'Supabase not configured'}), 500
    
    try:
        response = supabase.table('users').select('*').execute()
        return jsonify({
            'users': response.data,
            'count': len(response.data)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users', methods=['POST'])
def create_user():
    """Create a new user in Supabase"""
    if not supabase:
        return jsonify({'error': 'Supabase not configured'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        response = supabase.table('users').insert(data).execute()
        return jsonify({
            'message': 'User created successfully',
            'user': response.data[0] if response.data else None
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    app.run(debug=True, host='127.0.0.1', port=3000)
