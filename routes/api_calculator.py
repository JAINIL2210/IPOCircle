from flask import Blueprint, jsonify, request
from models import db, IPO
from services.calculations import calculate_allotment_probability

api_calculator = Blueprint('api_calculator', __name__)

@api_calculator.route('/api/calculator/estimate', methods=['POST'])
def estimate_chances():
    data = request.get_json() or {}
    ipo_id = data.get('ipo_id')
    category = data.get('category', 'Retail (RII)')
    lots_applied = int(data.get('lots_applied', 1))
    subscription_x = float(data.get('subscription_x', 1.0))

    if not ipo_id:
        return jsonify({'success': False, 'error': 'Please select an IPO'}), 400

    ipo = IPO.query.get(ipo_id)
    if not ipo:
        return jsonify({'success': False, 'error': 'Selected IPO not found'}), 404

    upper_price = ipo.max_price if ipo.max_price > 0 else ipo.issue_price
    
    result = calculate_allotment_probability(
        issue_size_cr=ipo.issue_size_cr,
        retail_quota_percent=ipo.retail_quota_percent,
        lot_size=ipo.lot_size,
        upper_price=upper_price,
        subscription_x=subscription_x,
        category=category,
        lots_applied=lots_applied
    )

    result['ipo_name'] = ipo.name
    result['lot_size'] = ipo.lot_size
    result['min_investment'] = upper_price * ipo.lot_size * lots_applied

    return jsonify({
        'success': True,
        'calculation': result
    })
