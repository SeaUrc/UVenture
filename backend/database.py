"""
Database module for shared Supabase client access
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None
    print("Warning: Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_KEY in .env file")

def get_supabase_client():
    """Get the Supabase client instance"""
    return supabase
