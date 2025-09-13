#!/usr/bin/env python3
"""
Simple test script for CMUGo backend API endpoints
"""

import requests
import json
import base64

# Configuration
BASE_URL = "http://127.0.0.1:5001/api"

def test_create_account():
    """Test creating a new account"""
    print("Testing account creation...")
    
    url = f"{BASE_URL}/auth/create_account"
    data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    return response.status_code == 200

def test_sign_in():
    """Test signing in and return token"""
    print("\nTesting sign in...")
    
    url = f"{BASE_URL}/auth/sign_in"
    data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        return response.json().get('token'), response.json().get('id')
    return None, None

def test_profile_endpoints(token, user_id):
    """Test profile endpoints with authentication"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\nTesting set team...")
    url = f"{BASE_URL}/profile/set_team"
    data = {"team": 1}
    response = requests.post(url, json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    print("\nTesting set picture...")
    url = f"{BASE_URL}/profile/set_picture"
    # Create a simple base64 encoded string (not a real image)
    sample_image = base64.b64encode(b"fake_image_data").decode('utf-8')
    data = {"image": sample_image}
    response = requests.post(url, json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    print("\nTesting get profile...")
    url = f"{BASE_URL}/profile/get_profile"
    data = {"id": user_id}
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    print("\nTesting remove picture...")
    url = f"{BASE_URL}/profile/remove_picture"
    data = {}
    response = requests.post(url, json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

def test_locations():
    """Test locations endpoints"""
    print("\nTesting get locations...")
    
    url = f"{BASE_URL}/locations/get_locations"
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Number of locations: {len(data.get('data', []))}")
        if data.get('data'):
            print("Sample location object:")
            print(json.dumps(data['data'][0], indent=2))

def main():
    print("CMUGo Backend API Test")
    print("=" * 30)
    print("Make sure the Flask server is running on http://127.0.0.1:5001")
    print()
    
    # Test locations (no auth required)
    test_locations()
    
    # Test authentication
    if test_create_account():
        token, user_id = test_sign_in()
        if token and user_id:
            test_profile_endpoints(token, user_id)
        else:
            print("Failed to get authentication token")
    else:
        print("Account creation failed, trying to sign in with existing account...")
        token, user_id = test_sign_in()
        if token and user_id:
            test_profile_endpoints(token, user_id)

if __name__ == "__main__":
    main()
