from flask import Blueprint, jsonify, request
from services.allotment_service import check_single_allotment, process_bulk_allotment, validate_pan

api_allotment = Blueprint('api_allotment', __name__)

@api_allotment.route('/api/allotment/check', methods=['POST'])
def allotment_check():
    data = request.get_json() or {}
    ipo_id = data.get('ipo_id')
    pan = data.get('pan')

    if not ipo_id or not pan:
        return jsonify({'success': False, 'error': 'Please select an IPO and enter a valid PAN number.'}), 400

    result = check_single_allotment(ipo_id, pan)
    if not result['success']:
        return jsonify(result), 400

    return jsonify(result)

@api_allotment.route('/api/allotment/bulk-check', methods=['POST'])
def bulk_allotment_check():
    data = request.get_json() or {}
    ipo_id = data.get('ipo_id')
    pans_input = data.get('pans', [])

    if not ipo_id:
        return jsonify({'success': False, 'error': 'Please select an IPO.'}), 400

    pan_list = []
    if isinstance(pans_input, str):
        # Split by newline, comma, or whitespace
        pan_list = [p.strip() for p in pans_input.replace(',', '\n').split('\n') if p.strip()]
    elif isinstance(pans_input, list):
        pan_list = [str(p).strip() for p in pans_input if str(p).strip()]

    if not pan_list:
        return jsonify({'success': False, 'error': 'No valid PAN numbers provided in bulk request.'}), 400

    result = process_bulk_allotment(ipo_id, pan_list)
    return jsonify({
        'success': True,
        'ipo_id': ipo_id,
        'summary': {
            'total_processed': result['total_processed'],
            'valid_pans': result['valid_pans'],
            'invalid_pans': result['invalid_pans'],
            'allotted_count': result['allotted_count'],
            'non_allotted_count': result['non_allotted_count']
        },
        'results': result['results']
    })
