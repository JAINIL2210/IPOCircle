from flask import Blueprint, render_template

views = Blueprint('views', __name__)

@views.route('/', defaults={'path': ''})
@views.route('/<path:path>')
def index_view(path):
    return render_template('index.html')
