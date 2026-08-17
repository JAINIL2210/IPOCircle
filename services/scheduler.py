import threading
import time
import logging
from services.live_fetcher import parse_and_sync_live_ipos

logger = logging.getLogger("IPOScheduler")

class BackgroundScheduler:
    def __init__(self, interval_seconds=21600): # Default: Every 6 hours (4 times daily)
        self.interval = interval_seconds
        self.thread = None
        self.running = False
        self.app = None

    def start(self, app):
        self.app = app
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info(f"Background Daily Ingestion Scheduler started (Interval: {self.interval}s).")

    def _run_loop(self):
        # Initial run after 5 seconds
        time.sleep(5)
        while self.running:
            try:
                with self.app.app_context():
                    logger.info("Scheduler triggering automated live GMP & IPO ingestion sync...")
                    parse_and_sync_live_ipos()
            except Exception as e:
                logger.error(f"Scheduler execution error: {e}")
            
            time.sleep(self.interval)

scheduler = BackgroundScheduler()
