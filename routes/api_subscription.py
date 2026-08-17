from flask import Blueprint, jsonify, request
from models import db, IPO, IPOSubscription

api_subscription = Blueprint('api_subscription', __name__)

@api_subscription.route('/api/subscription/live', methods=['GET'])
def get_live_subscription():
    ipos = IPO.query.filter(IPO.status.in_(['Ongoing', 'Closed', 'Upcoming'])).all()
    sub_list = []

    for ipo in ipos:
        sub = ipo.subscription
        if sub:
            s_dict = sub.to_dict()
            s_dict['ipo_name'] = ipo.name
            s_dict['company_name'] = ipo.company_name
            s_dict['slug'] = ipo.slug
            s_dict['category'] = ipo.category
            s_dict['status'] = ipo.status
            s_dict['close_date'] = ipo.close_date
            sub_list.append(s_dict)

    # Sort by total oversubscription descending
    sub_list.sort(key=lambda x: x['total_x'], reverse=True)

    return jsonify({
        'success': True,
        'count': len(sub_list),
        'subscriptions': sub_list
    })
