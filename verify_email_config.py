import sys
import os

# Ensure backend package can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.scheduler_worker import send_email_alert, EMAIL_SENDER

print(f"Attempting to send test email from {EMAIL_SENDER} to self...")
try:
    send_email_alert(EMAIL_SENDER, "Test Email from Verification Script", "This is a test email to verify configuration.")
    print("SUCCESS: Email sent without error.")
except Exception as e:
    print(f"FAILURE: Email sending failed with error: {e}")
