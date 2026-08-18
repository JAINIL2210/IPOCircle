import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ipocircle-secret-key-prod-2026-key')
    
    # Resolve database URL (supporting Vercel Postgres, Supabase, Neon, or SQLite fallback)
    db_url = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')
    if db_url:
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        SQLALCHEMY_DATABASE_URI = db_url
    else:
        # If running in Vercel Serverless environment, use /tmp for writeable SQLite storage
        if os.environ.get('VERCEL'):
            SQLALCHEMY_DATABASE_URI = 'sqlite:////tmp/ipocircle.db'
        else:
            basedir = os.path.abspath(os.path.dirname(__file__))
            SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(basedir, "ipocircle.db")}'

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'ipocircle-jwt-secret-key-2026')
    JSON_SORT_KEYS = False
