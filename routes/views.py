from flask import Blueprint, render_template, send_from_directory
import os

views = Blueprint('views', __name__)

@views.route('/')
@views.route('/gmp')
@views.route('/screener')
@views.route('/subscription')
@views.route('/allotment')
@views.route('/calendar')
@views.route('/calculator')
@views.route('/ipo/<slug>')
@views.route('/reviews')
@views.route('/blog')
@views.route('/blog/<slug>')
@views.route('/watchlist')
@views.route('/admin')
def index_view(slug=None):
    return render_template('index.html')
