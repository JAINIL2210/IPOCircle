import jwt
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User

api_auth = Blueprint('api_auth', __name__)

def generate_token(user):
    payload = {
        'sub': user.id,
        'email': user.email,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except Exception:
        return None

@api_auth.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    name = data.get('name', '').strip()

    if not email or not password or not name:
        return jsonify({'success': False, 'error': 'Name, email, and password are required.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'An account with this email already exists.'}), 400

    hashed = generate_password_hash(password)
    user = User(email=email, password_hash=hashed, name=name, role='user')
    db.session.add(user)
    db.session.commit()

    token = generate_token(user)
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })

@api_auth.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'success': False, 'error': 'Invalid email or password.'}), 401

    token = generate_token(user)
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })

@api_auth.route('/api/auth/me', methods=['GET'])
def get_me():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'authenticated': False}), 401
    
    token = auth_header.split(' ')[1]
    payload = decode_token(token)
    if not payload:
        return jsonify({'success': False, 'authenticated': False}), 401

    user = User.query.get(payload['sub'])
    if not user:
        return jsonify({'success': False, 'authenticated': False}), 404

    return jsonify({
        'success': True,
        'authenticated': True,
        'user': user.to_dict()
    })
