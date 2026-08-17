from flask import Blueprint, jsonify, request
from models import db, User, Watchlist, SavedPan, IPO
from routes.api_auth import decode_token

api_user = Blueprint('api_user', __name__)

def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    payload = decode_token(token)
    if not payload:
        return None
    return User.query.get(payload['sub'])

@api_user.route('/api/user/watchlist', methods=['GET'])
def get_watchlist():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    w_items = Watchlist.query.filter_by(user_id=user.id).all()
    ipo_ids = [w.ipo_id for w in w_items]
    ipos = IPO.query.filter(IPO.id.in_(ipo_ids)).all() if ipo_ids else []

    return jsonify({
        'success': True,
        'ipos': [ipo.to_dict() for ipo in ipos]
    })

@api_user.route('/api/user/watchlist', methods=['POST'])
def add_to_watchlist():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    ipo_id = data.get('ipo_id')
    if not ipo_id:
        return jsonify({'success': False, 'error': 'ipo_id required'}), 400

    existing = Watchlist.query.filter_by(user_id=user.id, ipo_id=ipo_id).first()
    if not existing:
        item = Watchlist(user_id=user.id, ipo_id=ipo_id)
        db.session.add(item)
        db.session.commit()

    return jsonify({'success': True, 'message': 'Added to watchlist'})

@api_user.route('/api/user/watchlist/<int:ipo_id>', methods=['DELETE'])
def remove_from_watchlist(ipo_id):
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    existing = Watchlist.query.filter_by(user_id=user.id, ipo_id=ipo_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()

    return jsonify({'success': True, 'message': 'Removed from watchlist'})

@api_user.route('/api/user/saved-pans', methods=['GET'])
def get_saved_pans():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    pans = SavedPan.query.filter_by(user_id=user.id).all()
    return jsonify({
        'success': True,
        'saved_pans': [p.to_dict() for p in pans]
    })

@api_user.route('/api/user/saved-pans', methods=['POST'])
def add_saved_pan():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    label = data.get('label', 'Default').strip()
    pan = data.get('pan_number', '').strip().upper()

    if not pan or len(pan) != 10:
        return jsonify({'success': False, 'error': 'Valid 10-character PAN number required.'}), 400

    sp = SavedPan(user_id=user.id, label=label, pan_number=pan)
    db.session.add(sp)
    db.session.commit()

    return jsonify({'success': True, 'saved_pan': sp.to_dict()})
