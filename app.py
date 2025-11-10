from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file, session
import json
import os
import cv2
import numpy as np
from io import BytesIO
import tempfile
from database import db, StudySession, StoredCoordinate, PolygonSet
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-this')

# Database configuration
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Handle Heroku's postgres:// URL
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # Local development - use SQLite
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///visual_snow_study.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Database helper functions
def load_coordinates():
    """Load coordinates from database, converting to old format for compatibility"""
    coordinates = StoredCoordinate.query.all()
    return [coord.to_dict() for coord in coordinates]

def save_coordinates(coordinates_list):
    """Save coordinates to database (for admin interface compatibility)"""
    # Clear existing coordinates
    StoredCoordinate.query.delete()
    
    # Add new coordinates
    for coord_data in coordinates_list:
        coord = StoredCoordinate(
            id=coord_data.get('id'),
            label=coord_data.get('label', ''),
            points=coord_data.get('points', [])
        )
        db.session.add(coord)
    
    db.session.commit()

def load_polygon_sets():
    """Load polygon sets from database, converting to old format"""
    sets = PolygonSet.query.all()
    result = {}
    for polygon_set in sets:
        result[polygon_set.name] = polygon_set.to_dict()
    return result

def save_polygon_sets(polygon_sets_dict):
    """Save polygon sets to database"""
    # Clear existing sets
    PolygonSet.query.delete()
    
    # Add new sets
    for name, set_data in polygon_sets_dict.items():
        polygon_set = PolygonSet(
            name=name,
            description=set_data.get('description', ''),
            polygons=set_data.get('polygons', [])
        )
        db.session.add(polygon_set)
    
    db.session.commit()

@app.route('/')
def homepage():
    test_completed = session.get('test_completed', False)
    return render_template('index.html', test_completed=test_completed)

@app.route('/proceed', methods=['POST'])
def proceed_to_study():
    consent = request.form.get('consent')
    if consent == 'on':
        return redirect(url_for('study'))
    else:
        flash('You must provide consent to participate in the study.')
        return redirect(url_for('homepage'))

@app.route('/study')
def study():
    coordinates = load_coordinates()
    return render_template('study.html', stored_coordinates=coordinates)

@app.route('/admin')
def admin():
    # Check if user is authenticated
    if not session.get('admin_authenticated'):
        return redirect(url_for('admin_login'))
    
    coordinates = load_coordinates()
    polygon_sets = load_polygon_sets()
    return render_template('admin.html', stored_coordinates=coordinates, polygon_sets=polygon_sets)

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == 'lite5':
            session['admin_authenticated'] = True
            return redirect(url_for('admin'))
        else:
            flash('Invalid password. Please try again.')
            return render_template('admin_login.html')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_authenticated', None)
    flash('You have been logged out.')
    return redirect(url_for('admin_login'))

@app.route('/api/coordinates', methods=['GET', 'POST', 'DELETE'])
def api_coordinates():
    if request.method == 'GET':
        return jsonify(load_coordinates())
    
    elif request.method == 'POST':
        data = request.get_json()
        coordinates = load_coordinates()
        coordinates.append(data)
        save_coordinates(coordinates)
        return jsonify({'success': True, 'id': len(coordinates)})
    
    elif request.method == 'DELETE':
        polygon_id = request.args.get('id')
        if polygon_id:
            coordinates = load_coordinates()
            coordinates = [c for c in coordinates if c.get('id') != int(polygon_id)]
            save_coordinates(coordinates)
            return jsonify({'success': True})
        else:
            # Delete all
            save_coordinates([])
            return jsonify({'success': True})

@app.route('/api/polygon-sets', methods=['GET', 'POST', 'PUT', 'DELETE'])
def api_polygon_sets():
    if request.method == 'GET':
        return jsonify(load_polygon_sets())
    
    elif request.method == 'POST':
        # Save current coordinates as a new polygon set
        data = request.get_json()
        set_name = data.get('name')
        if not set_name:
            return jsonify({'error': 'Set name is required'}), 400
        
        coordinates = load_coordinates()
        polygon_sets = load_polygon_sets()
        
        polygon_sets[set_name] = {
            'name': set_name,
            'polygons': coordinates,
            'created_at': data.get('created_at'),
            'description': data.get('description', '')
        }
        
        save_polygon_sets(polygon_sets)
        return jsonify({'success': True, 'set_name': set_name})
    
    elif request.method == 'PUT':
        # Load a polygon set into current coordinates
        data = request.get_json()
        set_name = data.get('name')
        if not set_name:
            return jsonify({'error': 'Set name is required'}), 400
        
        polygon_sets = load_polygon_sets()
        if set_name not in polygon_sets:
            return jsonify({'error': 'Set not found'}), 404
        
        coordinates = polygon_sets[set_name]['polygons']
        save_coordinates(coordinates)
        return jsonify({'success': True, 'coordinates': coordinates})
    
    elif request.method == 'DELETE':
        # Delete a polygon set
        set_name = request.args.get('name')
        if not set_name:
            return jsonify({'error': 'Set name is required'}), 400
        
        polygon_sets = load_polygon_sets()
        if set_name in polygon_sets:
            del polygon_sets[set_name]
            save_polygon_sets(polygon_sets)
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Set not found'}), 404

def generate_processed_image(brightness=1.0, noise_intensity=0.4):
    """
    Generate image with custom brightness and noise
    """
    # Read the original image
    img_path = 'static/images/Computer_Room_Desk_2008.jpg'
    img = cv2.imread(img_path)
    if img is None:
        return None
    
    # Apply brightness adjustment
    img_float = img.astype(np.float32)
    img_bright = img_float * brightness
    img_bright = np.clip(img_bright, 0, 255).astype(np.uint8)
    
    # Add noise
    height, width, channels = img_bright.shape
    noise = np.random.randint(0, 256, (height, width, channels), dtype=np.uint8)
    noise_mask = np.random.random((height, width)) < 0.15  # 15% of pixels get noise
    
    final_noise = np.zeros_like(img_bright)
    for i in range(channels):
        final_noise[:, :, i] = noise[:, :, i] * noise_mask
    
    # Blend noise with image
    img_float = img_bright.astype(np.float32)
    noise_float = final_noise.astype(np.float32)
    noisy_img = img_float + (noise_float * noise_intensity)
    noisy_img = np.clip(noisy_img, 0, 255).astype(np.uint8)
    
    return noisy_img

@app.route('/api/generate-image')
def generate_image():
    brightness = float(request.args.get('brightness', 1.0))
    noise = float(request.args.get('noise', 0.4))
    
    processed_img = generate_processed_image(brightness, noise)
    if processed_img is None:
        return jsonify({'error': 'Could not process image'}), 500
    
    # Encode image to memory buffer
    success, img_encoded = cv2.imencode('.jpg', processed_img)
    if not success:
        return jsonify({'error': 'Could not encode image'}), 500
    
    # Create BytesIO object
    img_buffer = BytesIO(img_encoded.tobytes())
    img_buffer.seek(0)
    
    return send_file(img_buffer, mimetype='image/jpeg', as_attachment=False)

@app.route('/api/submit-score', methods=['POST'])
def submit_score():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'score', 'time', 'clicks', 'foundObjects', 'targetObjects']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Extract questionnaire data
        questionnaire = data.get('questionnaire', {})
        
        # Create new study session record
        session = StudySession(
            username=data['username'],
            score=data['score'],
            time_ms=data['time'],
            clicks=data['clicks'],
            found_objects=data['foundObjects'],
            target_objects=data['targetObjects'],
            image_mode=data.get('imageMode', 'normal'),
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
        db.session.commit()
        
        # Mark test as completed in session
        from flask import session as flask_session
        flask_session['test_completed'] = True
        
        return jsonify({'success': True, 'message': 'Study data submitted successfully'})
    
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting score: {e}")
        return jsonify({'error': 'Failed to submit study data'}), 500

@app.route('/api/export-data')
def export_data():
    """Export all study data as JSON (for research analysis)"""
    try:
        sessions = StudySession.query.order_by(StudySession.timestamp.desc()).all()
        data = [session.to_dict() for session in sessions]
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': 'Failed to export data'}), 500

@app.route('/api/admin/results')
def admin_results():
    # Check if user is authenticated for API access
    if not session.get('admin_authenticated'):
        return jsonify({'error': 'Authentication required'}), 401
    """Get study results for admin interface"""
    try:
        # Get query parameters for filtering
        image_mode = request.args.get('image_mode')
        username = request.args.get('username')
        
        # Build query
        query = StudySession.query
        
        if image_mode:
            query = query.filter(StudySession.image_mode == image_mode)
        
        if username:
            query = query.filter(StudySession.username.ilike(f'%{username}%'))
        
        # Get results ordered by most recent first
        sessions = query.order_by(StudySession.timestamp.desc()).all()
        data = [session.to_dict() for session in sessions]
        
        return jsonify({
            'success': True,
            'count': len(data),
            'results': data
        })
    except Exception as e:
        return jsonify({'error': 'Failed to load results'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)