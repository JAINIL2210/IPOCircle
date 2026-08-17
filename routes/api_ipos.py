from flask import Blueprint, jsonify, request
from models import db, IPO, IPOFinancials, IPOReview, IPOGmpHistory
from services.calculations import calculate_gmp_metrics

api_ipos = Blueprint('api_ipos', __name__)

@api_ipos.route('/api/ipos', methods=['GET'])
def get_ipos():
    status_filter = request.args.get('status')
    category_filter = request.args.get('category')
    search_query = request.args.get('search')
    
    query = IPO.query
    
    if status_filter:
        query = query.filter_by(status=status_filter)
    if category_filter and category_filter != 'All':
        query = query.filter_by(category=category_filter)
    if search_query:
        term = f"%{search_query}%"
        query = query.filter((IPO.name.ilike(term)) | (IPO.company_name.ilike(term)) | (IPO.symbol.ilike(term)))
        
    ipos = query.order_by(IPO.id.desc()).all()
    return jsonify({
        'success': True,
        'count': len(ipos),
        'ipos': [ipo.to_dict() for ipo in ipos]
    })

@api_ipos.route('/api/ipos/upcoming', methods=['GET'])
def get_upcoming_ipos():
    ipos = IPO.query.filter_by(status='Upcoming').all()
    return jsonify({
        'success': True,
        'ipos': [ipo.to_dict() for ipo in ipos]
    })

@api_ipos.route('/api/ipos/ongoing', methods=['GET'])
def get_ongoing_ipos():
    ipos = IPO.query.filter_by(status='Ongoing').all()
    return jsonify({
        'success': True,
        'ipos': [ipo.to_dict() for ipo in ipos]
    })

@api_ipos.route('/api/ipos/screener', methods=['GET'])
def screener():
    status = request.args.get('status', 'All')
    category = request.args.get('category', 'All')
    sector = request.args.get('sector', 'All')
    min_gmp = request.args.get('min_gmp', type=float)
    search = request.args.get('search', '').strip()

    query = IPO.query

    if status != 'All':
        query = query.filter_by(status=status)
    if category != 'All':
        query = query.filter_by(category=category)
    if sector != 'All':
        query = query.filter_by(sector=sector)
    if search:
        term = f"%{search}%"
        query = query.filter((IPO.name.ilike(term)) | (IPO.company_name.ilike(term)))

    ipos = query.all()
    results = []
    for ipo in ipos:
        d = ipo.to_dict()
        gmp_val = d['gmp']['gmp_amount'] if d['gmp'] else 0
        if min_gmp is not None and gmp_val < min_gmp:
            continue
        results.append(d)

    return jsonify({
        'success': True,
        'count': len(results),
        'ipos': results
    })

@api_ipos.route('/api/ipos/<slug>', methods=['GET'])
def get_ipo_detail(slug):
    ipo = IPO.query.filter_by(slug=slug).first()
    if not ipo:
        # Try lookup by id if numeric
        if slug.isdigit():
            ipo = IPO.query.get(int(slug))
    if not ipo:
        return jsonify({'success': False, 'error': 'IPO not found'}), 404

    data = ipo.to_dict()
    
    # Attach financial history
    fin_list = IPOFinancials.query.filter_by(ipo_id=ipo.id).all()
    data['financials'] = [f.to_dict() for f in fin_list]

    # Attach GMP history
    gmp_hist = IPOGmpHistory.query.filter_by(ipo_id=ipo.id).all()
    data['gmp_history'] = [h.to_dict() for h in gmp_hist]

    # Attach review
    rev = IPOReview.query.filter_by(ipo_id=ipo.id).first()
    data['review'] = rev.to_dict() if rev else None

    return jsonify({
        'success': True,
        'ipo': data
    })

@api_ipos.route('/api/calendar', methods=['GET'])
def get_calendar():
    ipos = IPO.query.all()
    events = []
    for ipo in ipos:
        if ipo.open_date:
            events.append({'ipo_id': ipo.id, 'name': ipo.name, 'slug': ipo.slug, 'event': 'IPO Opens', 'date': ipo.open_date, 'category': ipo.category, 'status': ipo.status})
        if ipo.close_date:
            events.append({'ipo_id': ipo.id, 'name': ipo.name, 'slug': ipo.slug, 'event': 'IPO Closes', 'date': ipo.close_date, 'category': ipo.category, 'status': ipo.status})
        if ipo.allotment_date:
            events.append({'ipo_id': ipo.id, 'name': ipo.name, 'slug': ipo.slug, 'event': 'Allotment Date', 'date': ipo.allotment_date, 'category': ipo.category, 'status': ipo.status})
        if ipo.listing_date:
            events.append({'ipo_id': ipo.id, 'name': ipo.name, 'slug': ipo.slug, 'event': 'Listing Date', 'date': ipo.listing_date, 'category': ipo.category, 'status': ipo.status})
            
    return jsonify({
        'success': True,
        'events': events,
        'ipos': [ipo.to_dict() for ipo in ipos]
    })
