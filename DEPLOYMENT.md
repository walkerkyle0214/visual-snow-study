# Deployment Guide for Visual Snow Study

## Quick Setup

### 1. Local Development with Database
```bash
# Install dependencies
pip install -r requirements.txt

# Migrate existing JSON data to database (run once)
python migrate_data.py

# Run the app
python app.py
```

### 2. Deploy to Heroku

#### Prerequisites
- Heroku account
- Heroku CLI installed
- Git repository

#### Deployment Steps
```bash
# Login to Heroku
heroku login

# Create new app
heroku create your-study-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set SECRET_KEY=your-very-secure-secret-key-here

# Deploy
git add .
git commit -m "Deploy visual snow study"
git push heroku main

# The database will be automatically created via the Procfile
```

#### View your live site
```bash
heroku open
```

## Database Structure

### Tables Created:
- **study_sessions**: Main research data with questionnaire responses
- **stored_coordinates**: Object coordinate data for admin
- **polygon_sets**: Saved polygon sets for different studies

## Data Export

Access your research data at: `/api/export-data`

This returns JSON with all study sessions including:
- Performance metrics (score, time, clicks)
- Questionnaire responses (Likert scale + yes/no)
- Technical details (image mode, timestamps)

## Environment Variables

### Required for Production:
- `SECRET_KEY`: Flask session security
- `DATABASE_URL`: Automatically set by Heroku PostgreSQL

### Local Development:
- Uses SQLite database (no setup required)
- Set `DATABASE_URL` if you want to use PostgreSQL locally

## File Structure
```
VSFVH/
├── app.py              # Main Flask application
├── database.py         # Database models
├── requirements.txt    # Python dependencies
├── Procfile           # Heroku deployment config
├── migrate_data.py    # One-time migration script
├── .env.example       # Environment variable template
├── templates/         # HTML templates
├── static/           # CSS, JS, images
└── DEPLOYMENT.md     # This file
```

## Security Features
- Database instead of JSON files
- Environment-based configuration
- Encrypted connections (HTTPS on Heroku)
- Anonymous data collection
- No sensitive information logged

## Backup & Export
- Heroku automatically backs up PostgreSQL
- Use `/api/export-data` endpoint for research analysis
- Data exports as clean JSON for statistical software