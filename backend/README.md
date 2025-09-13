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

## API Endpoints

All API endpoints are prefixed with `/api`:

### Authentication (`/api/auth`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/logout` - User logout

### Profile (`/api/profile`)
- `GET /api/profile/` - Get user profile
- `PUT /api/profile/` - Update user profile
- `GET /api/profile/stats` - Get user statistics

### Locations (`/api/locations`)
- `GET /api/locations/` - Get all locations
- `GET /api/locations/<id>` - Get specific location
- `POST /api/locations/` - Create new location
- `POST /api/locations/nearby` - Get nearby locations

### Battles (`/api/battles`)
- `GET /api/battles/` - Get all battles
- `GET /api/battles/<id>` - Get specific battle
- `POST /api/battles/` - Create new battle
- `POST /api/battles/<id>/join` - Join a battle
- `POST /api/battles/<id>/result` - Submit battle result

### Teams (`/api/teams`)
- `GET /api/teams/` - Get all teams
- `GET /api/teams/<id>` - Get specific team
- `POST /api/teams/` - Create new team
- `GET /api/teams/<id>/members` - Get team members
- `POST /api/teams/<id>/join` - Join a team
- `POST /api/teams/<id>/leave` - Leave a team

### System
- `GET /` - API information and available endpoints
- `GET /health` - Health check (includes Supabase status)

## Supabase Configuration

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to find your project URL and anon key
3. Add these credentials to your `.env` file
4. Create a `users` table in your Supabase database for the user endpoints to work
