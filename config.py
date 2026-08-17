import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ipocircle-secret-key-prod-2026-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///ipocircle.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'ipocircle-jwt-secret-key-2026')
    JSON_SORT_KEYS = False
