# scheduler_worker.py
import time
import smtplib
from email.mime.text import MIMEText
from apscheduler.schedulers.background import BackgroundScheduler

from .backend_scrapper import compare_product
from . import storage

import os



# =========================
# EMAIL CONFIG (GMAIL)
# =========================
import logging

logger = logging.getLogger("pricenest.scheduler")

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587



EMAIL_SENDER = os.getenv("EMAIL_SENDER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")



# =========================
# SEND EMAIL FUNCTION
# =========================
def send_email_alert(receiver_email, subject, body):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_SENDER
    msg["To"] = receiver_email

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)

        logger.info(f"[EMAIL SENT] to {receiver_email}")
        return True

    except Exception as e:
        logger.error(f"[EMAIL ERROR] {e}")
        return False


# =========================
# ALERT CHECK JOB
# =========================
def check_alerts_job():
    logger.info("[Scheduler] Checking alerts...")
    try:
        alerts = storage.list_alerts()

        if not alerts:
            logger.info("No alerts found.")
            return

        for a in alerts:
            if not a.get("is_active", True):
                continue

            query = a["query"]
            target_price = int(a["target_price"])
            receiver_email = a["email"]

            logger.info(f"Checking Alert ID {a['id']} | {query} | Target ₹{target_price}")

            try:
                result = compare_product(query)
            except Exception as e:
                 logger.error(f"Error scraping {query}: {e}")
                 continue

            if not result.get("results"):
                logger.warning(f"No prices found for {query}.")
                continue

            best = result["results"][0]
            try:
                best_price = int(best["price_numeric"])
            except (ValueError, TypeError):
                 logger.error(f"Invalid price format for {query}: {best.get('price_numeric')}")
                 continue

            logger.info(f"Best Price Found for {query}: ₹{best_price}")

            # =========================
            # ALERT CONDITION
            # =========================
            if best_price <= target_price:
                subject = f"🎉 Price Drop Alert: {query}"

                body = (
                    f"Price Alert Triggered!\n\n"
                    f"Product: {query}\n"
                    f"Target Price: ₹{target_price:,}\n"
                    f"Current Price: ₹{best_price:,}\n"
                    f"Store: {best['source']}\n"
                    f"Link: {best['link']}\n\n"
                    f"Alert ID: {a['id']}"
                )

                logger.info("[ALERT TRIGGERED] Sending email...")
                if send_email_alert(receiver_email, subject, body):
                    storage.deactivate_alert(a["id"])
                    logger.info(f"Alert {a['id']} sent and deactivated.")
    except Exception as e:
        logger.exception("Critical error in scheduler job")


# =========================
# MAIN RUNNER
# =========================
