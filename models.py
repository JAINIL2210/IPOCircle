from datetime import datetime
from database import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), default='user') # 'user' or 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    watchlists = db.relationship('Watchlist', backref='user', lazy=True, cascade="all, delete-orphan")
    saved_pans = db.relationship('SavedPan', backref='user', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class IPO(db.Model):
    __tablename__ = 'ipos'
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    company_name = db.Column(db.String(200), nullable=False)
    symbol = db.Column(db.String(30), nullable=True)
    category = db.Column(db.String(20), default='Mainboard') # 'Mainboard' or 'SME'
    status = db.Column(db.String(20), default='Upcoming') # 'Upcoming', 'Ongoing', 'Closed', 'Listed'
    sector = db.Column(db.String(100), default='Diversified')
    exchange = db.Column(db.String(50), default='NSE, BSE')
    
    min_price = db.Column(db.Float, default=0.0)
    max_price = db.Column(db.Float, default=0.0)
    issue_price = db.Column(db.Float, default=0.0)
    lot_size = db.Column(db.Integer, default=1)
    issue_size_cr = db.Column(db.Float, default=0.0)
    fresh_issue_cr = db.Column(db.Float, default=0.0)
    ofs_cr = db.Column(db.Float, default=0.0)
    
    open_date = db.Column(db.String(30), nullable=True)
    close_date = db.Column(db.String(30), nullable=True)
    allotment_date = db.Column(db.String(30), nullable=True)
    refund_date = db.Column(db.String(30), nullable=True)
    credit_date = db.Column(db.String(30), nullable=True)
    listing_date = db.Column(db.String(30), nullable=True)
    
    registrar_name = db.Column(db.String(100), default='Link Intime India')
    registrar_url = db.Column(db.String(255), nullable=True)
    
    # Valuation & Quotas
    pe_ratio = db.Column(db.Float, default=0.0)
    pb_ratio = db.Column(db.Float, default=0.0)
    mcap_cr = db.Column(db.Float, default=0.0)
    qib_quota_percent = db.Column(db.Float, default=50.0)
    nii_quota_percent = db.Column(db.Float, default=15.0)
    retail_quota_percent = db.Column(db.Float, default=35.0)

    # Details text
    business_overview = db.Column(db.Text, nullable=True)
    promoters_info = db.Column(db.Text, nullable=True)
    objects_of_issue = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    gmp = db.relationship('IPOGmp', backref='ipo', uselist=False, cascade="all, delete-orphan")
    gmp_history = db.relationship('IPOGmpHistory', backref='ipo', lazy=True, cascade="all, delete-orphan")
    subscription = db.relationship('IPOSubscription', backref='ipo', uselist=False, cascade="all, delete-orphan")
    financials = db.relationship('IPOFinancials', backref='ipo', lazy=True, cascade="all, delete-orphan")
    review = db.relationship('IPOReview', backref='ipo', uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        upper_price = self.max_price if self.max_price > 0 else self.issue_price
        min_invest = upper_price * self.lot_size if upper_price else 0

        gmp_data = self.gmp.to_dict() if self.gmp else None
        sub_data = self.subscription.to_dict() if self.subscription else None

        return {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'company_name': self.company_name,
            'symbol': self.symbol,
            'category': self.category,
            'status': self.status,
            'sector': self.sector,
            'exchange': self.exchange,
            'min_price': self.min_price,
            'max_price': self.max_price,
            'issue_price': self.issue_price,
            'upper_price': upper_price,
            'lot_size': self.lot_size,
            'min_investment': round(min_invest, 2),
            'issue_size_cr': self.issue_size_cr,
            'fresh_issue_cr': self.fresh_issue_cr,
            'ofs_cr': self.ofs_cr,
            'open_date': self.open_date,
            'close_date': self.close_date,
            'allotment_date': self.allotment_date,
            'refund_date': self.refund_date,
            'credit_date': self.credit_date,
            'listing_date': self.listing_date,
            'registrar_name': self.registrar_name,
            'registrar_url': self.registrar_url,
            'pe_ratio': self.pe_ratio,
            'pb_ratio': self.pb_ratio,
            'mcap_cr': self.mcap_cr,
            'qib_quota_percent': self.qib_quota_percent,
            'nii_quota_percent': self.nii_quota_percent,
            'retail_quota_percent': self.retail_quota_percent,
            'business_overview': self.business_overview,
            'promoters_info': self.promoters_info,
            'objects_of_issue': self.objects_of_issue,
            'gmp': gmp_data,
            'subscription': sub_data
        }

class IPOGmp(db.Model):
    __tablename__ = 'ipo_gmp'
    id = db.Column(db.Integer, primary_key=True)
    ipo_id = db.Column(db.Integer, db.ForeignKey('ipos.id'), nullable=False, unique=True)
    gmp_amount = db.Column(db.Float, default=0.0)
    gmp_change = db.Column(db.Float, default=0.0) # + or - vs previous
    gmp_percent = db.Column(db.Float, default=0.0)
    estimated_listing_price = db.Column(db.Float, default=0.0)
    estimated_profit_per_lot = db.Column(db.Float, default=0.0)
    trend_direction = db.Column(db.String(10), default='UP') # 'UP', 'DOWN', 'FLAT'
    data_source = db.Column(db.String(100), default='Grey Market Desk (Verified)')
    verification_status = db.Column(db.String(50), default='Verified Unofficial Market')
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ipo_id': self.ipo_id,
            'gmp_amount': self.gmp_amount,
            'gmp_change': self.gmp_change,
            'gmp_percent': round(self.gmp_percent, 2),
            'estimated_listing_price': self.estimated_listing_price,
            'estimated_profit_per_lot': self.estimated_profit_per_lot,
            'trend_direction': self.trend_direction,
            'data_source': self.data_source,
            'verification_status': self.verification_status,
            'last_updated': self.last_updated.strftime('%d %b %Y, %I:%M %p') if self.last_updated else None
        }

class IPOGmpHistory(db.Model):
    __tablename__ = 'ipo_gmp_history'
    id = db.Column(db.Integer, primary_key=True)
    ipo_id = db.Column(db.Integer, db.ForeignKey('ipos.id'), nullable=False)
    recorded_date = db.Column(db.String(30), nullable=False)
    gmp_amount = db.Column(db.Float, default=0.0)
    gmp_percent = db.Column(db.Float, default=0.0)
    estimated_listing_price = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {
            'recorded_date': self.recorded_date,
            'gmp_amount': self.gmp_amount,
            'gmp_percent': self.gmp_percent,
            'estimated_listing_price': self.estimated_listing_price
        }

class IPOSubscription(db.Model):
    __tablename__ = 'ipo_subscription'
    id = db.Column(db.Integer, primary_key=True)
    ipo_id = db.Column(db.Integer, db.ForeignKey('ipos.id'), nullable=False, unique=True)
    qib_x = db.Column(db.Float, default=0.0)
    nii_x = db.Column(db.Float, default=0.0)
    retail_x = db.Column(db.Float, default=0.0)
    emp_x = db.Column(db.Float, default=0.0)
    total_x = db.Column(db.Float, default=0.0)
    total_applications = db.Column(db.Integer, default=0)
    shares_offered = db.Column(db.BigInteger, default=0)
    shares_bid = db.Column(db.BigInteger, default=0)
    data_status = db.Column(db.String(50), default='Live Official Exchange Data')
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ipo_id': self.ipo_id,
            'qib_x': self.qib_x,
            'nii_x': self.nii_x,
            'retail_x': self.retail_x,
            'emp_x': self.emp_x,
            'total_x': self.total_x,
            'total_applications': self.total_applications,
            'shares_offered': self.shares_offered,
            'shares_bid': self.shares_bid,
            'data_status': self.data_status,
            'last_updated': self.last_updated.strftime('%d %b %Y, %I:%M %p') if self.last_updated else None
        }

class IPOFinancials(db.Model):
    __tablename__ = 'ipo_financials'
    id = db.Column(db.Integer, primary_key=True)
    ipo_id = db.Column(db.Integer, db.ForeignKey('ipos.id'), nullable=False)
    fiscal_year = db.Column(db.String(20), nullable=False) # e.g. 'FY22', 'FY23', 'FY24'
    revenue_cr = db.Column(db.Float, default=0.0)
    ebitda_cr = db.Column(db.Float, default=0.0)
    ebitda_margin = db.Column(db.Float, default=0.0)
    pat_cr = db.Column(db.Float, default=0.0)
    pat_margin = db.Column(db.Float, default=0.0)
    eps = db.Column(db.Float, default=0.0)
    roe = db.Column(db.Float, default=0.0)
    roce = db.Column(db.Float, default=0.0)
    debt_cr = db.Column(db.Float, default=0.0)
    networth_cr = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {
            'fiscal_year': self.fiscal_year,
            'revenue_cr': self.revenue_cr,
            'ebitda_cr': self.ebitda_cr,
            'ebitda_margin': self.ebitda_margin,
            'pat_cr': self.pat_cr,
            'pat_margin': self.pat_margin,
            'eps': self.eps,
            'roe': self.roe,
            'roce': self.roce,
            'debt_cr': self.debt_cr,
            'networth_cr': self.networth_cr
        }

class IPOReview(db.Model):
    __tablename__ = 'ipo_reviews'
    id = db.Column(db.Integer, primary_key=True)
    ipo_id = db.Column(db.Integer, db.ForeignKey('ipos.id'), nullable=False, unique=True)
    summary = db.Column(db.Text, nullable=False)
    strengths = db.Column(db.Text, nullable=True) # JSON or newline separated
    risks = db.Column(db.Text, nullable=True)
    valuation_verdict = db.Column(db.Text, nullable=True)
    peer_comparison_notes = db.Column(db.Text, nullable=True)
    overall_rating = db.Column(db.String(20), default='Subscribe') # 'Subscribe', 'May Apply', 'Avoid', 'Neutral'
    author = db.Column(db.String(100), default='IPOCircle Research Team')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'summary': self.summary,
            'strengths': self.strengths.split('\n') if self.strengths else [],
            'risks': self.risks.split('\n') if self.risks else [],
            'valuation_verdict': self.valuation_verdict,
            'peer_comparison_notes': self.peer_comparison_notes,
            'overall_rating': self.overall_rating,
            'author': self.author,
            'updated_at': self.updated_at.strftime('%d %b %Y') if self.updated_at else None
        }

class IPOAllotmentRecord(db.Model):
    __tablename__ = 'ipo_allotment_records'
    id = db.Column(db.Integer, primary_key=True)
    ipo_id = db.Column(db.Integer, db.ForeignKey('ipos.id'), nullable=False)
    pan_number = db.Column(db.String(15), nullable=False, index=True)
    application_no = db.Column(db.String(30), nullable=True)
    dp_id = db.Column(db.String(30), nullable=True)
    allotted = db.Column(db.Boolean, default=False)
    shares_allotted = db.Column(db.Integer, default=0)
    registrar = db.Column(db.String(100), default='Link Intime')
    status_text = db.Column(db.String(100), default='Allotment Declared')

    def to_dict(self):
        # Mask PAN: e.g. ABCDE1234F -> ABCDE****F
        masked_pan = self.pan_number[:5] + "****" + self.pan_number[-1] if len(self.pan_number) == 10 else self.pan_number
        return {
            'id': self.id,
            'ipo_id': self.ipo_id,
            'pan_masked': masked_pan,
            'application_no': self.application_no,
            'dp_id': self.dp_id,
            'allotted': self.allotted,
            'shares_allotted': self.shares_allotted,
            'registrar': self.registrar,
            'status_text': self.status_text
        }

class Watchlist(db.Model):
    __tablename__ = 'watchlists'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ipo_id = db.Column(db.Integer, db.ForeignKey('ipos.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SavedPan(db.Model):
    __tablename__ = 'saved_pans'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    label = db.Column(db.String(100), nullable=False) # e.g. "Self", "Father", "Spouse"
    pan_number = db.Column(db.String(15), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        masked = self.pan_number[:5] + "****" + self.pan_number[-1] if len(self.pan_number) == 10 else self.pan_number
        return {
            'id': self.id,
            'label': self.label,
            'pan_masked': masked,
            'pan_full': self.pan_number
        }

class BlogPost(db.Model):
    __tablename__ = 'blog_posts'
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(150), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), default='IPO Guide') # 'IPO Guide', 'News', 'GMP Updates', 'Allotment'
    summary = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100), default='IPOCircle Editorial')
    read_time = db.Column(db.String(20), default='5 min read')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'slug': self.slug,
            'title': self.title,
            'category': self.category,
            'summary': self.summary,
            'content': self.content,
            'author': self.author,
            'read_time': self.read_time,
            'date': self.created_at.strftime('%b %d, %Y') if self.created_at else None
        }

class DataSource(db.Model):
    __tablename__ = 'data_sources'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    endpoint_type = db.Column(db.String(50), default='Exchange REST API')
    status = db.Column(db.String(20), default='HEALTHY') # 'HEALTHY', 'DEGRADED', 'OFFLINE'
    last_success = db.Column(db.DateTime, default=datetime.utcnow)
    last_error = db.Column(db.String(255), nullable=True)
    response_time_ms = db.Column(db.Integer, default=120)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'endpoint_type': self.endpoint_type,
            'status': self.status,
            'last_success': self.last_success.strftime('%Y-%m-%d %H:%M:%S') if self.last_success else None,
            'last_error': self.last_error,
            'response_time_ms': self.response_time_ms
        }
