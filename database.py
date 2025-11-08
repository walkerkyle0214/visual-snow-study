from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class StudySession(db.Model):
    __tablename__ = 'study_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    time_ms = db.Column(db.Integer, nullable=False)  # Time in milliseconds
    clicks = db.Column(db.Integer, nullable=False)
    found_objects = db.Column(db.Integer, nullable=False)
    target_objects = db.Column(db.Integer, nullable=False)
    image_mode = db.Column(db.String(20), nullable=False)  # 'normal' or 'visual_snow'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Questionnaire responses
    frustrated = db.Column(db.Integer)  # 1-5 Likert scale
    challenged = db.Column(db.Integer)
    happy = db.Column(db.Integer)
    angry = db.Column(db.Integer)
    upset = db.Column(db.Integer)
    defeated = db.Column(db.Integer)
    content = db.Column(db.Integer)
    joyful = db.Column(db.Integer)
    heard_visual_snow = db.Column(db.String(3))  # 'yes' or 'no'
    have_visual_snow = db.Column(db.String(3))   # 'yes' or 'no'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'score': self.score,
            'time_ms': self.time_ms,
            'clicks': self.clicks,
            'found_objects': self.found_objects,
            'target_objects': self.target_objects,
            'image_mode': self.image_mode,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'questionnaire': {
                'frustrated': self.frustrated,
                'challenged': self.challenged,
                'happy': self.happy,
                'angry': self.angry,
                'upset': self.upset,
                'defeated': self.defeated,
                'content': self.content,
                'joyful': self.joyful,
                'heard_visual_snow': self.heard_visual_snow,
                'have_visual_snow': self.have_visual_snow
            }
        }

class StoredCoordinate(db.Model):
    __tablename__ = 'stored_coordinates'
    
    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(100), nullable=False)
    points_json = db.Column(db.Text, nullable=False)  # JSON string of points array
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @property
    def points(self):
        return json.loads(self.points_json)
    
    @points.setter
    def points(self, value):
        self.points_json = json.dumps(value)
    
    def to_dict(self):
        return {
            'id': self.id,
            'label': self.label,
            'points': self.points
        }

class PolygonSet(db.Model):
    __tablename__ = 'polygon_sets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    polygons_json = db.Column(db.Text, nullable=False)  # JSON string of polygons array
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @property
    def polygons(self):
        return json.loads(self.polygons_json)
    
    @polygons.setter
    def polygons(self, value):
        self.polygons_json = json.dumps(value)
    
    def to_dict(self):
        return {
            'name': self.name,
            'description': self.description,
            'polygons': self.polygons,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }