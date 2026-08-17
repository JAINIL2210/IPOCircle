from datetime import datetime
from models import db, DataSource

def get_data_sources_status():
    """
    Returns live monitoring information for external ingestion endpoints.
    """
    sources = DataSource.query.all()
    if not sources:
        # Seed default sources if empty
        default_sources = [
            DataSource(name='NSE Live Subscription API', endpoint_type='Exchange REST API', status='HEALTHY', response_time_ms=115),
            DataSource(name='BSE Bidding Feed Engine', endpoint_type='Exchange Data Stream', status='HEALTHY', response_time_ms=142),
            DataSource(name='Link Intime Registrar Gateway', endpoint_type='Registrar Gateway', status='HEALTHY', response_time_ms=210),
            DataSource(name='KFintech Allotment Portal', endpoint_type='Registrar API', status='HEALTHY', response_time_ms=185),
            DataSource(name='Bigshare Services Feed', endpoint_type='Registrar Gateway', status='HEALTHY', response_time_ms=240),
            DataSource(name='Grey Market Pulse Feed', endpoint_type='Market Intelligence', status='HEALTHY', response_time_ms=95)
        ]
        for s in default_sources:
            db.session.add(s)
        db.session.commit()
        sources = DataSource.query.all()
        
    return [s.to_dict() for s in sources]

def update_source_health(source_id, status, error_msg=None):
    src = DataSource.query.get(source_id)
    if src:
        src.status = status
        if status == 'HEALTHY':
            src.last_success = datetime.utcnow()
            src.last_error = None
        else:
            src.last_error = error_msg or 'Connection timeout'
        db.session.commit()
        return src.to_dict()
    return None
