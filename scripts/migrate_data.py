#!/usr/bin/env python3
"""
Migration script to move data from JSON files to database
Run this once to migrate your existing data before deploying
"""

import json
import os
from app import app, db
from database import StudySession, StoredCoordinate, PolygonSet
from datetime import datetime

def migrate_coordinates():
    """Migrate stored_coordinates.json to database"""
    if os.path.exists('stored_coordinates.json'):
        with open('stored_coordinates.json', 'r') as f:
            coordinates = json.load(f)
        
        for coord_data in coordinates:
            coord = StoredCoordinate(
                id=coord_data.get('id'),
                label=coord_data.get('label', ''),
                points=coord_data.get('points', [])
            )
            db.session.add(coord)
        
        print(f"Migrated {len(coordinates)} coordinate sets")

def migrate_polygon_sets():
    """Migrate polygon_sets.json to database"""
    if os.path.exists('polygon_sets.json'):
        with open('polygon_sets.json', 'r') as f:
            polygon_sets = json.load(f)
        
        for name, set_data in polygon_sets.items():
            polygon_set = PolygonSet(
                name=name,
                description=set_data.get('description', ''),
                polygons=set_data.get('polygons', []),
                created_at=datetime.fromisoformat(set_data['created_at'].replace('Z', '+00:00')) if set_data.get('created_at') else datetime.utcnow()
            )
            db.session.add(polygon_set)
        
        print(f"Migrated {len(polygon_sets)} polygon sets")

def migrate_scores():
    """Migrate game_scores.json to database"""
    if os.path.exists('game_scores.json'):
        with open('game_scores.json', 'r') as f:
            scores = json.load(f)
        
        for score_data in scores:
            # Handle questionnaire data if it exists
            questionnaire = score_data.get('questionnaire', {})
            
            session = StudySession(
                username=score_data['username'],
                score=score_data['score'],
                time_ms=score_data['time'],
                clicks=score_data['clicks'],
                found_objects=score_data['foundObjects'],
                target_objects=score_data['targetObjects'],
                image_mode=score_data.get('imageMode', 'normal'),
                timestamp=datetime.fromisoformat(score_data['timestamp'].replace('Z', '+00:00')) if score_data.get('timestamp') else datetime.utcnow(),
                frustrated=questionnaire.get('frustrated'),
                challenged=questionnaire.get('challenged'),
                happy=questionnaire.get('happy'),
                angry=questionnaire.get('angry'),
                upset=questionnaire.get('upset'),
                defeated=questionnaire.get('defeated'),
                content=questionnaire.get('content'),
                joyful=questionnaire.get('joyful'),
                heard_visual_snow=questionnaire.get('heardVisualSnow'),
                have_visual_snow=questionnaire.get('haveVisualSnow')
            )
            db.session.add(session)
        
        print(f"Migrated {len(scores)} study sessions")

def main():
    with app.app_context():
        # Create all tables
        db.create_all()
        print("Created database tables")
        
        # Migrate data
        migrate_coordinates()
        migrate_polygon_sets()
        migrate_scores()
        
        # Commit all changes
        db.session.commit()
        print("Migration completed successfully!")
        
        # Show summary
        coord_count = StoredCoordinate.query.count()
        set_count = PolygonSet.query.count()
        session_count = StudySession.query.count()
        
        print(f"\nDatabase summary:")
        print(f"- Coordinates: {coord_count}")
        print(f"- Polygon sets: {set_count}")
        print(f"- Study sessions: {session_count}")

if __name__ == '__main__':
    main()