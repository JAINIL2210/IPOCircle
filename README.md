# IPOCircle (IPO Pulse) - Production-Ready Indian IPO Intelligence Platform

**IPOCircle / IPO Pulse** is a complete, production-ready, modern, responsive Indian IPO tracking, live GMP analytics, subscription monitoring, single/bulk allotment status checking, financial research, educational content, and administrative management platform.

---

## 🛠️ Technology Stack Architecture

### Frontend
- **Framework**: Next.js / React / TypeScript / HTML5 / CSS3 / Tailwind CSS
- **Icons**: Lucide React Icons
- **Data Visualizations**: Recharts / Chart.js
- **PWA & Mobile**: Progressive Web App Manifest (`manifest.json`), Sticky Mobile Navigation Bar

### Backend & Database
- **API Engine**: Python (FastAPI / Flask) with RESTful JSON endpoints & Pydantic validation schemas
- **Database**: PostgreSQL (Production) / SQLite (Development out-of-the-box zero-config execution) via SQLAlchemy ORM
- **Cache & Jobs**: Redis + Celery / Built-in Background Ingestion Daemon
- **Auth & Security**: JWT tokens, HTTP-Only cookies, Argon2 / bcrypt password hashing, masked PAN handling (`ABCDE****F`), rate limiting, no logging of raw PANs

---

## 🌟 Key Functional Features & Routes

1. **Homepage (`/`)**:
   - Hero Section, Live Market Status, Top Live GMP Ticker, Ongoing Bidding Cards, Upcoming IPO Highlights, Quick Allotment Lookup Widget, Subscription Summary Bar, Listing Performance, News & Reviews, FAQs.

2. **IPO Directory & Screener (`/ipo`, `/screener`, `/ipo/upcoming`, `/ipo/ongoing`, `/ipo/closed`, `/ipo/mainboard`, `/ipo/sme`)**:
   - Search by name, symbol, sector.
   - Filter by Status (Ongoing, Upcoming, Closed, Listed) and Category (Mainboard vs SME).
   - Dynamic sorting by Highest GMP, GMP %, Subscription Ratio, Issue Size.

3. **Live GMP Dashboard (`/gmp`, `/ipo/gmp/[slug]`)**:
   - Live GMP table with Upper Price, GMP, Estimated Listing Price ($\text{Issue Price} + \text{GMP}$), Estimated Profit Per Lot ($\text{GMP} \times \text{Lot Size}$), GMP %, trend indicators.
   - 5-Day Historical GMP trend graphs using Recharts/Chart.js.
   - Sourced, timestamped, SEBI compliant grey-market disclaimers.

4. **Live Subscription Tracker (`/subscription`, `/ipo/subscription/[slug]`)**:
   - Category-wise oversubscription breakdown (QIB, NII/HNI, Retail, Employee, Total) with visual progress bars and bid application counts.

5. **Dedicated Allotment Checker (`/allotment`, `/check-allotment`, `/check-allotment/bulk`)**:
   - **Single PAN Check**: Select IPO, enter PAN, query registrar (Link Intime, KFintech, Bigshare, Maashitla, Cameo, Skyline), display status badge (Allotted / Not Allotted), shares count, application number, and DP ID.
   - **Bulk PAN Check**: CSV / Excel / Text file drag & drop or text input, validate inputs, process batch request, summary metrics (Processed, Valid, Invalid, Allotted, Non-Allotted), masked PAN table, and CSV report export.

6. **Allotment Chances Calculator (`/calculator`)**:
   - Mathematical probability estimator based on retail computer lottery rules, sNII, bNII, category subscription multiples, and applied lots.

7. **Upcoming IPO Calendar (`/calendar`, `/ipo/calendar`)**:
   - Monthly calendar grid & milestone timeline tracking Opening, Closing, Allotment, Refund, Share Credit, and Listing dates.

8. **Individual IPO Research Pages (`/ipo/[slug]`)**:
   - Overview, Quota Reservations, 3-Year Financials table & multi-bar charts (Revenue, EBITDA, PAT, EPS, Debt, ROE, ROCE), Valuation Metrics (P/E, P/B, EV/EBITDA, MCap), Peer Comparison, Analyst Review Verdict, FAQs.

9. **IPO Educational Guides & Blogs (`/blogs`, `/blogs/[slug]`)**:
   - How-to articles ("How to check allotment", "How GMP works", "Mainboard vs SME"), search, categories, FAQs, and JSON-LD schema metadata.

10. **User Watchlist & Accounts (`/watchlist`, `/dashboard`)**:
    - Account registration, login, saved IPO watchlist, saved family PAN profiles.

11. **Admin Control Panel (`/admin`)**:
    - Real-time metrics (Total IPOs, Active, Upcoming, Allotment Today, Users, Ingestion Health), IPO CRUD, Live GMP Editor, Subscription Editor, Content Manager, Data Source Monitoring (`HEALTHY`, `DEGRADED`, `OFFLINE`).

---

## ⚡ Quick Start & Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Git

### 2. Installation & Running Locally

```bash
# Clone repository
git clone https://github.com/JAINIL2210/IPOCircle.git
cd IPOCircle

# Install dependencies
python -m pip install -r requirements.txt

# Run server with automated daily scheduler & live market scrapers
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

### 3. Running Automated Test Suite
```bash
python -m pytest
```

---

## 🐳 Docker Deployment

To run the entire full-stack application with PostgreSQL and Redis via Docker Compose:

```bash
docker-compose up --build -d
```

---

## 🔒 Security & PAN Handling Compliance

- **Masked Display**: PAN numbers are always masked as `ABCDE****F` in UI displays and reports.
- **No Raw Logging**: Sensitive PAN strings are processed in memory and never logged to stdout or file logs.
- **HTTPS & Encryption**: Production deployment enforces TLS 1.3 encryption in transit and rest.

---

## 📡 Live Ingestion Architecture

```text
External Market Feeds (Chittorgarh / IPOWatch / Investorgain / Exchange Feeds)
                            ↓
                  Live Ingestion Engine (services/live_fetcher.py)
                            ↓
               Background Scheduler Daemon (services/scheduler.py)
                            ↓
                    SQLite / PostgreSQL DB
                            ↓
                   REST API & Web Client
```

---

## 📄 License & Disclaimer

IPO Grey Market Premium (GMP) data and estimates provided by IPOCircle / IPO Pulse are gathered from market sources for reference and educational purposes only. They do not constitute investment advice.
