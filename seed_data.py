from datetime import datetime, timedelta
from database import db
from models import (
    User, IPO, IPOGmp, IPOGmpHistory, IPOSubscription, 
    IPOFinancials, IPOReview, IPOAllotmentRecord, BlogPost, DataSource
)
from werkzeug.security import generate_password_hash

def seed_database():
    # Clear existing tables
    db.drop_all()
    db.create_all()

    # 1. Admin & Demo User
    admin_user = User(
        email='admin@ipocircle.in',
        password_hash=generate_password_hash('Admin@12345'),
        name='IPOCircle Admin',
        role='admin'
    )
    demo_user = User(
        email='investor@ipocircle.in',
        password_hash=generate_password_hash('Investor@123'),
        name='Rajesh Sharma',
        role='user'
    )
    db.session.add(admin_user)
    db.session.add(demo_user)

    # 2. Seed IPOs
    ipos_data = [
        {
            'slug': 'tata-capital-ipo',
            'name': 'Tata Capital Limited IPO',
            'company_name': 'Tata Capital Limited',
            'symbol': 'TATACAP',
            'category': 'Mainboard',
            'status': 'Ongoing',
            'sector': 'Non-Banking Financial Company (NBFC)',
            'exchange': 'NSE, BSE',
            'min_price': 320.0,
            'max_price': 338.0,
            'issue_price': 338.0,
            'lot_size': 44,
            'issue_size_cr': 12500.0,
            'fresh_issue_cr': 7500.0,
            'ofs_cr': 5000.0,
            'open_date': '18 Aug 2026',
            'close_date': '20 Aug 2026',
            'allotment_date': '21 Aug 2026',
            'refund_date': '24 Aug 2026',
            'credit_date': '24 Aug 2026',
            'listing_date': '25 Aug 2026',
            'registrar_name': 'Link Intime India Pvt Ltd',
            'registrar_url': 'https://linkintime.co.in/ipoallotment.html',
            'pe_ratio': 24.5,
            'pb_ratio': 3.2,
            'mcap_cr': 85000.0,
            'business_overview': 'Tata Capital Limited is a premier financial services company of the Tata Group, offering retail lending, corporate finance, wealth management, and infrastructure finance.',
            'promoters_info': 'Tata Sons Private Limited holds 92.8% pre-issue equity stake.',
            'objects_of_issue': 'Augment Tier-I capital base to meet future capital requirements arising out of growth in business and assets.',
            'gmp_amount': 115.0,
            'gmp_change': 12.0,
            'subscription': {'qib': 48.5, 'nii': 26.2, 'retail': 14.8, 'emp': 3.1, 'total': 28.4, 'apps': 3420000, 'bid': 852000000},
            'financials': [
                {'fiscal': 'FY24', 'rev': 16840.0, 'ebitda': 8920.0, 'ebitda_m': 52.9, 'pat': 3150.0, 'pat_m': 18.7, 'eps': 14.2, 'roe': 18.5, 'roce': 12.4, 'debt': 94500.0, 'nw': 19200.0},
                {'fiscal': 'FY25', 'rev': 21400.0, 'ebitda': 11450.0, 'ebitda_m': 53.5, 'pat': 4210.0, 'pat_m': 19.6, 'eps': 18.9, 'roe': 20.1, 'roce': 13.8, 'debt': 112000.0, 'nw': 23400.0},
                {'fiscal': 'FY26 (E)', 'rev': 26800.0, 'ebitda': 14800.0, 'ebitda_m': 55.2, 'pat': 5480.0, 'pat_m': 20.4, 'eps': 24.6, 'roe': 22.4, 'roce': 15.1, 'debt': 128000.0, 'nw': 28900.0}
            ],
            'review': {
                'summary': 'Tata Capital carries robust brand backing, stellar asset quality (Gross NPA < 1.4%), and industry-leading return ratios. Highly recommended for long-term investors and listing gain seekers.',
                'strengths': 'Strong Tata brand lineage and corporate governance\nDiversified loan portfolio across retail, SME, and corporate lending\nHealthy Capital Adequacy Ratio (CAR > 18%)\nRobust digital distribution network across 600+ cities',
                'risks': 'Interest rate volatility affecting net interest margin (NIM)\nRegulatory shifts by RBI on NBFC capital norms\nMacroeconomic credit risk in retail uncollateralized portfolio',
                'verdict': 'Attractively priced relative to Bajaj Finance and Jio Financial Services.',
                'rating': 'Subscribe'
            }
        },
        {
            'slug': 'hexaware-technologies-ipo',
            'name': 'Hexaware Technologies IPO',
            'company_name': 'Hexaware Technologies Limited',
            'symbol': 'HEXAWARE',
            'category': 'Mainboard',
            'status': 'Upcoming',
            'sector': 'IT Services & Consulting',
            'exchange': 'NSE, BSE',
            'min_price': 680.0,
            'max_price': 708.0,
            'issue_price': 708.0,
            'lot_size': 21,
            'issue_size_cr': 9950.0,
            'fresh_issue_cr': 0.0,
            'ofs_cr': 9950.0,
            'open_date': '26 Aug 2026',
            'close_date': '28 Aug 2026',
            'allotment_date': '31 Aug 2026',
            'refund_date': '01 Sep 2026',
            'credit_date': '01 Sep 2026',
            'listing_date': '02 Sep 2026',
            'registrar_name': 'KFin Technologies Limited',
            'registrar_url': 'https://kosmic.kfintech.com/ipostatus/',
            'pe_ratio': 28.2,
            'pb_ratio': 5.8,
            'mcap_cr': 42000.0,
            'business_overview': 'Hexaware Technologies is a fast-growing global IT services firm specializing in AI transformational architecture, cloud modernization, and automation services.',
            'promoters_info': 'Carlyle Group (CA Magnum Holdings) holds 95.4% equity shareholding.',
            'objects_of_issue': 'Provide liquidity to promoter selling shareholder and gain public listing benefit.',
            'gmp_amount': 85.0,
            'gmp_change': 5.0,
            'subscription': {'qib': 0.0, 'nii': 0.0, 'retail': 0.0, 'emp': 0.0, 'total': 0.0, 'apps': 0, 'bid': 0},
            'financials': [
                {'fiscal': 'FY24', 'rev': 9850.0, 'ebitda': 1580.0, 'ebitda_m': 16.0, 'pat': 990.0, 'pat_m': 10.0, 'eps': 19.8, 'roe': 24.2, 'roce': 28.5, 'debt': 120.0, 'nw': 4100.0},
                {'fiscal': 'FY25', 'rev': 11400.0, 'ebitda': 1920.0, 'ebitda_m': 16.8, 'pat': 1240.0, 'pat_m': 10.9, 'eps': 24.8, 'roe': 26.5, 'roce': 31.0, 'debt': 95.0, 'nw': 4800.0}
            ],
            'review': {
                'summary': 'Solid mid-tier IT company re-entering Indian stock markets backed by Carlyle. Strong revenue CAGR of 16% in USD terms.',
                'strengths': 'High client retention rate (>95%)\nStrong focus on Generative AI enterprise services\nDebt-free balance sheet with high ROE',
                'risks': 'Entire issue is Offer For Sale (OFS)\nPotential slowdown in US/EU banking technology spending',
                'verdict': 'Subscribe for medium to long term.',
                'rating': 'Subscribe'
            }
        },
        {
            'slug': 'swiggy-limited-ipo',
            'name': 'Swiggy Limited IPO',
            'company_name': 'Swiggy Limited',
            'symbol': 'SWIGGY',
            'category': 'Mainboard',
            'status': 'Listed',
            'sector': 'Consumer Tech / Hyperlocal Delivery',
            'exchange': 'NSE, BSE',
            'min_price': 371.0,
            'max_price': 390.0,
            'issue_price': 390.0,
            'lot_size': 38,
            'issue_size_cr': 11327.0,
            'fresh_issue_cr': 4499.0,
            'ofs_cr': 6828.0,
            'open_date': '06 Nov 2025',
            'close_date': '08 Nov 2025',
            'allotment_date': '11 Nov 2025',
            'refund_date': '12 Nov 2025',
            'credit_date': '12 Nov 2025',
            'listing_date': '13 Nov 2025',
            'registrar_name': 'Link Intime India Pvt Ltd',
            'registrar_url': 'https://linkintime.co.in/ipoallotment.html',
            'pe_ratio': -42.0,
            'pb_ratio': 7.1,
            'mcap_cr': 89000.0,
            'business_overview': 'Swiggy is India pioneer hyperlocal commerce platform operating food delivery, Instamart quick commerce, Genie delivery, and Dineout.',
            'promoters_info': 'Professionally managed company without identifiable single promoter.',
            'objects_of_issue': 'Expansion of Instamart dark stores network, technology infrastructure investment, brand marketing, and inorganic acquisitions.',
            'gmp_amount': 22.0,
            'gmp_change': -2.0,
            'subscription': {'qib': 6.02, 'nii': 0.41, 'retail': 1.14, 'emp': 1.65, 'total': 3.59, 'apps': 1480000, 'bid': 406000000},
            'financials': [
                {'fiscal': 'FY23', 'rev': 8265.0, 'ebitda': -3120.0, 'ebitda_m': -37.7, 'pat': -4179.0, 'pat_m': -50.5, 'eps': -18.6, 'roe': -45.0, 'roce': -38.0, 'debt': 0.0, 'nw': 5200.0},
                {'fiscal': 'FY24', 'rev': 11247.0, 'ebitda': -1890.0, 'ebitda_m': -16.8, 'pat': -2350.0, 'pat_m': -20.9, 'eps': -10.4, 'roe': -28.0, 'roce': -22.0, 'debt': 0.0, 'nw': 7100.0}
            ],
            'review': {
                'summary': 'Swiggy is a market duopoly leader alongside Zomato in India food delivery and quick-commerce space.',
                'strengths': 'High market share in food delivery and Instamart\nImproving contribution margin per order\nStrong network density in top tier-1 cities',
                'risks': 'Intense competition from Zomato Blinkit and Zepto\nHigh cash burn in quick commerce warehouse expansion',
                'verdict': 'Listed at Rs 420 (7.7% gain). Suitable for aggressive risk-tolerant investors.',
                'rating': 'May Apply'
            }
        },
        {
            'slug': 'urban-infra-tech-sme-ipo',
            'name': 'Urban Infra Tech SME IPO',
            'company_name': 'Urban Infra Tech Solutions Limited',
            'symbol': 'URBANINFRA',
            'category': 'SME',
            'status': 'Ongoing',
            'sector': 'Infrastructure Engineering (SME)',
            'exchange': 'NSE SME',
            'min_price': 112.0,
            'max_price': 118.0,
            'issue_price': 118.0,
            'lot_size': 1200,
            'issue_size_cr': 38.5,
            'fresh_issue_cr': 38.5,
            'ofs_cr': 0.0,
            'open_date': '17 Aug 2026',
            'close_date': '19 Aug 2026',
            'allotment_date': '20 Aug 2026',
            'refund_date': '21 Aug 2026',
            'credit_date': '21 Aug 2026',
            'listing_date': '24 Aug 2026',
            'registrar_name': 'Bigshare Services Pvt Ltd',
            'registrar_url': 'https://www.bigshareonline.com/ipo_gm.html',
            'pe_ratio': 14.8,
            'pb_ratio': 2.4,
            'mcap_cr': 145.0,
            'business_overview': 'Urban Infra Tech executes specialized civil construction, smart city infrastructure, and stormwater drainage systems across Gujarat and Maharashtra.',
            'promoters_info': 'Mr. Vikram Patel and Mrs. Sunita Patel hold 100% pre-issue stake.',
            'objects_of_issue': 'Purchase of heavy earthmoving machinery, working capital requirements, and general corporate purposes.',
            'gmp_amount': 45.0,
            'gmp_change': 5.0,
            'subscription': {'qib': 12.4, 'nii': 45.8, 'retail': 82.3, 'emp': 0.0, 'total': 51.6, 'apps': 185000, 'bid': 210000000},
            'financials': [
                {'fiscal': 'FY24', 'rev': 68.0, 'ebitda': 11.2, 'ebitda_m': 16.4, 'pat': 6.8, 'pat_m': 10.0, 'eps': 6.8, 'roe': 24.5, 'roce': 28.1, 'debt': 8.5, 'nw': 27.5},
                {'fiscal': 'FY25', 'rev': 94.5, 'ebitda': 16.8, 'ebitda_m': 17.7, 'pat': 10.5, 'pat_m': 11.1, 'eps': 10.5, 'roe': 28.2, 'roce': 32.4, 'debt': 6.2, 'nw': 38.0}
            ],
            'review': {
                'summary': 'High-growth SME company with an order book of Rs 310 Crore (3.2x FY25 revenue). Attractive listing gain potential (>35%).',
                'strengths': 'Robust order book with government infrastructure bodies\nExpanding EBITDA margin trend\nLow lot size cost barrier relative to SME peer norms',
                'risks': 'SME liquidity risk post-listing\nCustomer concentration with state government agencies',
                'verdict': 'High GMP SME IPO. Subscribe for listing gains.',
                'rating': 'Subscribe'
            }
        },
        {
            'slug': 'premier-energies-ipo',
            'name': 'Premier Energies Limited IPO',
            'company_name': 'Premier Energies Limited',
            'symbol': 'PREMIERENE',
            'category': 'Mainboard',
            'status': 'Listed',
            'sector': 'Solar Energy Equipment',
            'exchange': 'NSE, BSE',
            'min_price': 427.0,
            'max_price': 450.0,
            'issue_price': 450.0,
            'lot_size': 33,
            'issue_size_cr': 2830.0,
            'fresh_issue_cr': 1291.0,
            'ofs_cr': 1539.0,
            'open_date': '03 Sep 2025',
            'close_date': '05 Sep 2025',
            'allotment_date': '06 Sep 2025',
            'refund_date': '09 Sep 2025',
            'credit_date': '09 Sep 2025',
            'listing_date': '10 Sep 2025',
            'registrar_name': 'KFin Technologies Limited',
            'registrar_url': 'https://kosmic.kfintech.com/ipostatus/',
            'pe_ratio': 32.4,
            'pb_ratio': 8.9,
            'mcap_cr': 20200.0,
            'business_overview': 'Premier Energies is India second-largest integrated solar cell and solar module manufacturer with 2.4 GW cell capacity and 4.1 GW module capacity.',
            'promoters_info': 'Chirpacing Surender Pal Singh and Jasleen Singh.',
            'objects_of_issue': 'Investment in subsidiary Premier Energies Global Environment for 4 GW TOPCon cell facility.',
            'gmp_amount': 380.0,
            'gmp_change': 20.0,
            'subscription': {'qib': 216.7, 'nii': 50.0, 'retail': 7.6, 'emp': 11.4, 'total': 74.3, 'apps': 3100000, 'bid': 489000000},
            'financials': [
                {'fiscal': 'FY24', 'rev': 3143.0, 'ebitda': 520.0, 'ebitda_m': 16.5, 'pat': 231.0, 'pat_m': 7.3, 'eps': 5.8, 'roe': 31.5, 'roce': 26.8, 'debt': 780.0, 'nw': 733.0}
            ],
            'review': {
                'summary': 'Blockbuster listing of 120% gain (Listed at Rs 990 vs Issue Price Rs 450). High growth solar renewable energy beneficiary.',
                'strengths': 'Second largest integrated solar cell maker in India\nStrong order book of Rs 5,300 Crore\nBeneficiary of ALMM and Government solar initiatives',
                'risks': 'Raw material silicon wafer price fluctuations',
                'verdict': 'Multi-bagger solar manufacturing company.',
                'rating': 'Subscribe'
            }
        }
    ]

    for data in ipos_data:
        gmp_val = data.pop('gmp_amount')
        gmp_change = data.pop('gmp_change')
        sub_info = data.pop('subscription')
        fin_info = data.pop('financials')
        rev_info = data.pop('review')

        ipo = IPO(**data)
        db.session.add(ipo)
        db.session.flush()

        # Add GMP
        upper = ipo.max_price if ipo.max_price > 0 else ipo.issue_price
        gmp_pct = (gmp_val / upper * 100.0) if upper else 0
        est_list = upper + gmp_val
        est_prof = gmp_val * ipo.lot_size

        gmp = IPOGmp(
            ipo_id=ipo.id,
            gmp_amount=gmp_val,
            gmp_change=gmp_change,
            gmp_percent=gmp_pct,
            estimated_listing_price=est_list,
            estimated_profit_per_lot=est_prof,
            trend_direction='UP' if gmp_change >= 0 else 'DOWN',
            data_source='Grey Market Desk (Verified)',
            last_updated=datetime.utcnow()
        )
        db.session.add(gmp)

        # Add 5-day GMP History
        for i in range(5, 0, -1):
            hist_date = (datetime.utcnow() - timedelta(days=i)).strftime('%d %b')
            h_gmp = max(0, gmp_val - (i * 3))
            h_pct = (h_gmp / upper * 100) if upper else 0
            hist = IPOGmpHistory(
                ipo_id=ipo.id,
                recorded_date=hist_date,
                gmp_amount=h_gmp,
                gmp_percent=round(h_pct, 1),
                estimated_listing_price=upper + h_gmp
            )
            db.session.add(hist)

        # Add Subscription
        sub = IPOSubscription(
            ipo_id=ipo.id,
            qib_x=sub_info['qib'],
            nii_x=sub_info['nii'],
            retail_x=sub_info['retail'],
            emp_x=sub_info['emp'],
            total_x=sub_info['total'],
            total_applications=sub_info['apps'],
            shares_bid=sub_info['bid'],
            last_updated=datetime.utcnow()
        )
        db.session.add(sub)

        # Add Financials
        for f in fin_info:
            fin = IPOFinancials(
                ipo_id=ipo.id,
                fiscal_year=f['fiscal'],
                revenue_cr=f['rev'],
                ebitda_cr=f['ebitda'],
                ebitda_margin=f['ebitda_m'],
                pat_cr=f['pat'],
                pat_margin=f['pat_m'],
                eps=f['eps'],
                roe=f['roe'],
                roce=f['roce'],
                debt_cr=f['debt'],
                networth_cr=f['nw']
            )
            db.session.add(fin)

        # Add Review
        rev = IPOReview(
            ipo_id=ipo.id,
            summary=rev_info['summary'],
            strengths=rev_info['strengths'],
            risks=rev_info['risks'],
            valuation_verdict=rev_info['verdict'],
            overall_rating=rev_info['rating']
        )
        db.session.add(rev)

    # 3. Seed Demo Allotment Records
    allotment_samples = [
        {'ipo_id': 1, 'pan': 'ABCDE1234F', 'app': 'APP1002931', 'allotted': True, 'shares': 44, 'reg': 'Link Intime'},
        {'ipo_id': 1, 'pan': 'PQRST5678G', 'app': 'APP1004812', 'allotted': False, 'shares': 0, 'reg': 'Link Intime'},
        {'ipo_id': 2, 'pan': 'ABCDE1234F', 'app': 'APP2001194', 'allotted': True, 'shares': 21, 'reg': 'KFintech'},
        {'ipo_id': 4, 'pan': 'XYZAB9999M', 'app': 'APP4009923', 'allotted': True, 'shares': 1200, 'reg': 'Bigshare'}
    ]
    for sample in allotment_samples:
        rec = IPOAllotmentRecord(
            ipo_id=sample['ipo_id'],
            pan_number=sample['pan'],
            application_no=sample['app'],
            allotted=sample['allotted'],
            shares_allotted=sample['shares'],
            registrar=sample['reg'],
            status_text='Shares Allotted' if sample['allotted'] else 'Not Allotted (Refund Processed)'
        )
        db.session.add(rec)

    # 4. Seed Blog Posts / Guides
    blogs_data = [
        {
            'slug': 'how-to-check-ipo-allotment-status-online',
            'title': 'How to Check IPO Allotment Status Online: Step-by-Step Guide',
            'category': 'IPO Guide',
            'summary': 'Learn how to check your IPO allotment status on official registrar websites like Link Intime, KFintech, and Bigshare using your PAN card or Application Number.',
            'content': '''Checking IPO allotment status is a crucial step after applying for an initial public offering in India. 

### Methods to Check IPO Allotment Status:

1. **Via Official Registrar Portals**:
   - **Link Intime**: Visit linkintime.co.in/ipoallotment.html, select company, enter 10-digit PAN number.
   - **KFintech**: Visit kosmic.kfintech.com/ipostatus/, select query type (PAN / Application No / DP Client ID).
   - **Bigshare Services**: Visit bigshareonline.com/ipo_gm.html.

2. **Via Stock Exchanges (BSE & NSE)**:
   - On BSE India (bseindia.com/investors/appli_check.aspx), choose Issue Type: **Equity**, select Issue Name, and enter Application No & PAN.

3. **Via IPOCircle Platform**:
   - Use our single or bulk allotment status checker to check up to 50 PAN numbers at once!''',
            'author': 'Suresh Mehta, Senior SEBI Research Analyst',
            'read_time': '4 min read'
        },
        {
            'slug': 'what-is-ipo-gmp-how-it-is-calculated',
            'title': 'What is IPO GMP (Grey Market Premium) & How to Calculate Estimated Listing Price',
            'category': 'GMP Updates',
            'summary': 'Understand how Grey Market Premium works in India, how it reflects market sentiment, and how to accurately compute estimated listing profits.',
            'content': '''Grey Market Premium (GMP) is the premium price at which IPO shares are traded in an unofficial, over-the-counter unregulated market before listing on BSE/NSE.

### Formulas:

1. **Estimated Listing Price**:
   $$\\text{Estimated Listing Price} = \\text{Upper Issue Price Band} + \\text{GMP}$$

2. **Estimated Profit Per Lot**:
   $$\\text{Estimated Profit} = \\text{GMP} \\times \\text{Lot Size}$$

3. **GMP Return %**:
   $$\\text{GMP } \\% = \\left( \\frac{\\text{GMP}}{\\text{Upper Issue Price}} \\right) \\times 100$$

*Disclaimer: GMP is purely indicative and unregulated. Always rely on company fundamentals before making investment decisions.*''',
            'author': 'IPOCircle Research Desk',
            'read_time': '6 min read'
        },
        {
            'slug': 'mainboard-vs-sme-ipo-key-differences',
            'title': 'Mainboard IPO vs SME IPO: Detailed Comparison for Retail Investors',
            'category': 'IPO Guide',
            'summary': 'Discover the essential differences between Mainboard IPOs and SME IPOs in India regarding issue size, lot sizes, trading liquidity, and risk profile.',
            'content': '''Indian stock exchanges offer two primary IPO routes: Mainboard (BSE & NSE main trading engine) and SME platforms (BSE SME & NSE Emerge).

| Parameter | Mainboard IPO | SME IPO |
| :--- | :--- | :--- |
| **Minimum Issue Size** | Rs 10 Crore+ | Under Rs 250 Crore |
| **Minimum Application Cost** | ~Rs 14,000 - 15,000 | ~Rs 100,000 - 140,000 |
| **Trading Lot Size** | 1 Share after listing | Fixed Lot (e.g. 1,000 - 2,000 shares) |
| **Track Record Requirement** | 3 Years Operating Profit | 2 Years Minimum |
| **Risk & Volatility** | Moderate | High / Liquidity Constraints |''',
            'author': 'Neha Sharma, CFA',
            'read_time': '5 min read'
        }
    ]
    for b in blogs_data:
        post = BlogPost(**b)
        db.session.add(post)

    # 5. Data Sources Health Ingestion Monitoring
    sources = [
        DataSource(name='NSE Live Bidding API', endpoint_type='Official Exchange API', status='HEALTHY', response_time_ms=98),
        DataSource(name='BSE Exchange Feed', endpoint_type='Official Exchange Feed', status='HEALTHY', response_time_ms=115),
        DataSource(name='Link Intime Registrar Portal', endpoint_type='Registrar Gateway', status='HEALTHY', response_time_ms=180),
        DataSource(name='KFintech Status Server', endpoint_type='Registrar Gateway', status='HEALTHY', response_time_ms=165),
        DataSource(name='Bigshare Gateway', endpoint_type='Registrar Gateway', status='HEALTHY', response_time_ms=210),
        DataSource(name='Grey Market Desk Ingestion', endpoint_type='Market Intelligence', status='HEALTHY', response_time_ms=85)
    ]
    for s in sources:
        db.session.add(s)

    db.session.commit()
    print("Database successfully seeded with realistic Indian IPO data!")

if __name__ == '__main__':
    from app import app
    with app.app_context():
        seed_database()
