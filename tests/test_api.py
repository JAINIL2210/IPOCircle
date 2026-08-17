import pytest
from app import create_app
from database import db

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            from seed_data import seed_database
            seed_database()
        yield client

def test_get_ipos_api(client):
    res = client.get('/api/ipos')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['count'] > 0

def test_get_live_gmp_api(client):
    res = client.get('/api/gmp/live')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert len(data['gmp_data']) > 0

def test_allotment_check_api(client):
    # Single PAN check
    res = client.post('/api/allotment/check', json={
        'ipo_id': 1,
        'pan': 'ABCDE1234F'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['pan_masked'] == 'ABCDE****F'

def test_bulk_allotment_check_api(client):
    res = client.post('/api/allotment/bulk-check', json={
        'ipo_id': 1,
        'pans': 'ABCDE1234F\nPQRST5678G\nINVALIDPAN'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['summary']['total_processed'] == 3
    assert data['summary']['valid_pans'] == 2
    assert data['summary']['invalid_pans'] == 1

def test_calculator_api(client):
    res = client.post('/api/calculator/estimate', json={
        'ipo_id': 1,
        'category': 'Retail (RII)',
        'subscription_x': 10.0,
        'lots_applied': 1
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert data['calculation']['probability_percent'] == 10.0
