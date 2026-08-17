import os
from flask import Flask
from config import Config
from database import db

def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config.from_object(Config)

    db.init_app(app)

    # Register Blueprints
    from routes.api_ipos import api_ipos
    from routes.api_gmp import api_gmp
    from routes.api_subscription import api_subscription
    from routes.api_allotment import api_allotment
    from routes.api_calculator import api_calculator
    from routes.api_auth import api_auth
    from routes.api_user import api_user
    from routes.api_admin import api_admin
    from routes.api_blogs import api_blogs
    from routes.views import views

    app.register_blueprint(api_ipos)
    app.register_blueprint(api_gmp)
    app.register_blueprint(api_subscription)
    app.register_blueprint(api_allotment)
    app.register_blueprint(api_calculator)
    app.register_blueprint(api_auth)
    app.register_blueprint(api_user)
    app.register_blueprint(api_admin)
    app.register_blueprint(api_blogs)
    app.register_blueprint(views)

    with app.app_context():
        db.create_all()
        # Seed if IPO table is empty
        from models import IPO
        if IPO.query.count() == 0:
            from seed_data import seed_database
            seed_database()
        
        # Start background daily automated live data ingestion scheduler
        from services.scheduler import scheduler
        scheduler.start(app)

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
