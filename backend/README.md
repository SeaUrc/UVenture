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
- `POST /api/auth/create_account` - Create new user account
  - Input: `{"username": string, "password": string}`
  - Success: `{}` (200)
  - Error: `{"error": string}` (400/409/500)
- `POST /api/auth/sign_in` - Sign in user
  - Input: `{"username": string, "password": string}`
  - Success: `{"token": string, "id": number}` (200)
  - Error: `{"error": string}` (400/401/500)

### Profile (`/api/profile`)
- `POST /api/profile/set_picture` - Set profile picture (requires auth)
  - Input: `{"image": "base64 image string"}`
  - Success: `{}` (200)
  - Error: `{"error": string}` (400/401/500)
- `POST /api/profile/remove_picture` - Remove profile picture (requires auth)
  - Input: `{}`
  - Success: `{}` (200)
  - Error: `{"error": string}` (401/500)
- `POST /api/profile/set_team` - Set user team (requires auth)
  - Input: `{"team": number}`
  - Success: `{}` (200)
  - Error: `{"error": string}` (400/401/500)
- `POST /api/profile/get_profile` - Get user profile by ID
  - Input: `{"id": number}`
  - Success: `{"username": string, "team": number, "image": string, "strength": number}` (200)
  - Error: `{"error": string}` (400/404/500)

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
4. Create a `users` table in your Supabase database with the following schema:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    team INTEGER,
    password_hash TEXT NOT NULL,
    strength INTEGER DEFAULT 0,
    image TEXT  -- For base64 profile pictures
);
```

## Authentication

For endpoints marked as "requires auth", include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Get the JWT token by calling `/api/auth/sign_in` with valid credentials.
