from datetime import datetime
from flask import Blueprint, jsonify, request
from models import db, IPO, IPOGmp, IPOSubscription, BlogPost, DataSource
from services.data_ingestion import get_data_sources_status, update_source_health
from services.calculations import calculate_gmp_metrics

api_admin = Blueprint('api_admin', __name__)

@api_admin.route('/api/admin/ipos', methods=['POST'])
def admin_create_ipo():
    data = request.get_json() or {}
    name = data.get('name')
    company_name = data.get('company_name', name)
    if not name:
        return jsonify({'success': False, 'error': 'IPO Name is required.'}), 400

    slug = name.lower().replace(' ', '-').replace('/', '-')
    
    ipo = IPO(
        slug=slug,
        name=name,
        company_name=company_name,
        symbol=data.get('symbol', ''),
        category=data.get('category', 'Mainboard'),
        status=data.get('status', 'Upcoming'),
        sector=data.get('sector', 'Diversified'),
        min_price=float(data.get('min_price', 0)),
        max_price=float(data.get('max_price', 0)),
        issue_price=float(data.get('issue_price', 0)),
        lot_size=int(data.get('lot_size', 1)),
        issue_size_cr=float(data.get('issue_size_cr', 0)),
        fresh_issue_cr=float(data.get('fresh_issue_cr', 0)),
        ofs_cr=float(data.get('ofs_cr', 0)),
        open_date=data.get('open_date'),
        close_date=data.get('close_date'),
        allotment_date=data.get('allotment_date'),
        refund_date=data.get('refund_date'),
        credit_date=data.get('credit_date'),
        listing_date=data.get('listing_date'),
        registrar_name=data.get('registrar_name', 'Link Intime'),
        business_overview=data.get('business_overview', '')
    )
    db.session.add(ipo)
    db.session.commit()

    # Create default GMP entry
    gmp = IPOGmp(ipo_id=ipo.id, gmp_amount=0.0, gmp_percent=0.0)
    sub = IPOSubscription(ipo_id=ipo.id, total_x=0.0)
    db.session.add(gmp)
    db.session.add(sub)
    db.session.commit()

    return jsonify({'success': True, 'ipo': ipo.to_dict()})

@api_admin.route('/api/admin/gmp/update', methods=['POST'])
def admin_update_gmp():
    data = request.get_json() or {}
    try:
        gmp_amount = float(data.get('gmp_amount') or 0)
    except (ValueError, TypeError):
        gmp_amount = 0.0
    source = data.get('data_source', 'Grey Market Desk (Verified Admin)')

    ipo = IPO.query.get(ipo_id)
    if not ipo:
        return jsonify({'success': False, 'error': 'IPO not found.'}), 404

    gmp = IPOGmp.query.filter_by(ipo_id=ipo.id).first()
    if not gmp:
        gmp = IPOGmp(ipo_id=ipo.id)

    metrics = calculate_gmp_metrics(ipo.issue_price, ipo.max_price, gmp_amount, ipo.lot_size)

    gmp.gmp_change = gmp_amount - gmp.gmp_amount
    gmp.gmp_amount = gmp_amount
    gmp.gmp_percent = metrics['gmp_percent']
    gmp.estimated_listing_price = metrics['estimated_listing_price']
    gmp.estimated_profit_per_lot = metrics['estimated_profit_per_lot']
    gmp.trend_direction = 'UP' if gmp.gmp_change >= 0 else 'DOWN'
    gmp.data_source = source
    gmp.last_updated = datetime.utcnow()

    db.session.commit()
    return jsonify({'success': True, 'gmp': gmp.to_dict()})

@api_admin.route('/api/admin/subscription/update', methods=['POST'])
def admin_update_subscription():
    data = request.get_json() or {}
    ipo_id = data.get('ipo_id')
    
    ipo = IPO.query.get(ipo_id)
    if not ipo:
        return jsonify({'success': False, 'error': 'IPO not found.'}), 404

    sub = IPOSubscription.query.filter_by(ipo_id=ipo.id).first()
    if not sub:
        sub = IPOSubscription(ipo_id=ipo.id)

    sub.qib_x = float(data.get('qib_x', sub.qib_x))
    sub.nii_x = float(data.get('nii_x', sub.nii_x))
    sub.retail_x = float(data.get('retail_x', sub.retail_x))
    sub.emp_x = float(data.get('emp_x', sub.emp_x))
    sub.total_x = float(data.get('total_x', sub.total_x))
    sub.total_applications = int(data.get('total_applications', sub.total_applications))
    sub.shares_bid = int(data.get('shares_bid', sub.shares_bid))
    sub.last_updated = datetime.utcnow()

    db.session.commit()
    return jsonify({'success': True, 'subscription': sub.to_dict()})

@api_admin.route('/api/admin/data-sources', methods=['GET'])
def admin_data_sources():
    sources = get_data_sources_status()
    return jsonify({
        'success': True,
        'sources': sources
    })

@api_admin.route('/api/admin/sync-live', methods=['POST'])
def admin_trigger_sync():
    from services.live_fetcher import parse_and_sync_live_ipos
    res = parse_and_sync_live_ipos()
    return jsonify(res)

