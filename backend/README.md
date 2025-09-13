# CMUGo Backend

A minimal Flask backend for the CMUGo application with Supabase integration.

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure Supabase:
```bash
cp .env.example .env
# Edit .env file and add your Supabase URL and API key
```

4. Run the application:
```bash
python app.py
```

The server will start on `http://localhost:5001`

## Endpoints

- `GET /` - Returns a welcome message
- `GET /health` - Health check endpoint (includes Supabase status)
- `GET /test-supabase` - Test Supabase connection
- `GET /users` - Get all users from Supabase
- `POST /users` - Create a new user in Supabase

## Supabase Configuration

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to find your project URL and anon key
3. Add these credentials to your `.env` file
4. Create a `users` table in your Supabase database for the user endpoints to work
