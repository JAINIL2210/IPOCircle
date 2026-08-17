import threading
import time
import logging
from services.live_fetcher import parse_and_sync_live_ipos

logger = logging.getLogger("IPOScheduler")

class BackgroundScheduler:
    def __init__(self, interval_seconds=1800): # Updated: Every 30 minutes (1800 seconds)
        self.interval = interval_seconds
        self.thread = None
        self.running = False
        self.app = None

    def start(self, app):
        self.app = app
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info(f"Background Ingestion Scheduler started (Sync Interval: Every 30 minutes / {self.interval}s).")

    def _run_loop(self):
        # Initial run after 3 seconds on startup
        time.sleep(3)
        while self.running:
            try:
                with self.app.app_context():
                    logger.info("30-Minute Scheduler triggered: Running automated live Indian IPO & GMP sync...")
                    parse_and_sync_live_ipos()
            except Exception as e:
                logger.error(f"Scheduler execution error: {e}")
            
            time.sleep(self.interval)

scheduler = BackgroundScheduler(interval_seconds=1800)
