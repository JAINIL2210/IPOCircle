from flask import Blueprint, jsonify, request
from models import db, IPO, IPOGmp, IPOGmpHistory

api_gmp = Blueprint('api_gmp', __name__)

@api_gmp.route('/api/gmp/live', methods=['GET'])
def get_live_gmp():
    sort_by = request.args.get('sort', 'highest_gmp') # 'highest_gmp', 'highest_percent', 'name'
    category = request.args.get('category', 'All')

    ipos = IPO.query.all()
    gmp_list = []

    for ipo in ipos:
        if category != 'All' and ipo.category != category:
            continue
        gmp = ipo.gmp
        if gmp:
            g_dict = gmp.to_dict()
            g_dict['ipo_name'] = ipo.name
            g_dict['company_name'] = ipo.company_name
            g_dict['slug'] = ipo.slug
            g_dict['category'] = ipo.category
            g_dict['status'] = ipo.status
            g_dict['issue_price'] = ipo.issue_price
            g_dict['upper_price'] = ipo.max_price if ipo.max_price > 0 else ipo.issue_price
            g_dict['lot_size'] = ipo.lot_size
            gmp_list.append(g_dict)

    if sort_by == 'highest_gmp':
        gmp_list.sort(key=lambda x: x['gmp_amount'], reverse=True)
    elif sort_by == 'highest_percent':
        gmp_list.sort(key=lambda x: x['gmp_percent'], reverse=True)
    elif sort_by == 'name':
        gmp_list.sort(key=lambda x: x['ipo_name'])

    return jsonify({
        'success': True,
        'disclaimer': 'IPO GMP (Grey Market Premium) is unofficial market data provided for information & educational purposes only.',
        'count': len(gmp_list),
        'gmp_data': gmp_list
    })

@api_gmp.route('/api/gmp/history/<int:ipo_id>', methods=['GET'])
def get_gmp_history(ipo_id):
    ipo = IPO.query.get(ipo_id)
    if not ipo:
        return jsonify({'success': False, 'error': 'IPO not found'}), 404

    history = IPOGmpHistory.query.filter_by(ipo_id=ipo.id).order_by(IPOGmpHistory.id.asc()).all()
    return jsonify({
        'success': True,
        'ipo_name': ipo.name,
        'history': [h.to_dict() for h in history]
    })
