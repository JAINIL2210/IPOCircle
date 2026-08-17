from flask import Blueprint, jsonify, request
from models import db, BlogPost, IPOReview, IPO

api_blogs = Blueprint('api_blogs', __name__)

@api_blogs.route('/api/blogs', methods=['GET'])
def get_blogs():
    cat = request.args.get('category')
    query = BlogPost.query
    if cat and cat != 'All':
        query = query.filter_by(category=cat)
    posts = query.order_by(BlogPost.id.desc()).all()
    return jsonify({
        'success': True,
        'posts': [p.to_dict() for p in posts]
    })

@api_blogs.route('/api/blogs/<slug>', methods=['GET'])
def get_blog_detail(slug):
    post = BlogPost.query.filter_by(slug=slug).first()
    if not post and slug.isdigit():
        post = BlogPost.query.get(int(slug))
    if not post:
        return jsonify({'success': False, 'error': 'Article not found.'}), 404
    return jsonify({
        'success': True,
        'post': post.to_dict()
    })

@api_blogs.route('/api/reviews', methods=['GET'])
def get_reviews():
    reviews = IPOReview.query.order_by(IPOReview.id.desc()).all()
    results = []
    for r in reviews:
        d = r.to_dict()
        ipo = IPO.query.get(r.ipo_id)
        if ipo:
            d['ipo_name'] = ipo.name
            d['slug'] = ipo.slug
            d['category'] = ipo.category
            d['issue_price'] = ipo.issue_price
        results.append(d)

    return jsonify({
        'success': True,
        'reviews': results
    })
