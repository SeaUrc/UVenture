from flask import Blueprint, request, jsonify
from database import get_supabase_client

profile_bp = Blueprint('profile', __name__)

# Get Supabase client
supabase = get_supabase_client()

