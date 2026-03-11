import smtplib
import os
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from dotenv import load_dotenv

load_dotenv()

smtp_host = os.getenv("SMTP_HOST")
smtp_port = int(os.getenv("SMTP_PORT", 587))
smtp_user = os.getenv("SMTP_USERNAME")
smtp_pass = os.getenv("SMTP_PASSWORD")
smtp_from = os.getenv("SMTP_FROM_EMAIL")

to_email = "test-khg6mufl7@srv1.mail-tester.com"

msg = EmailMessage()
msg['Subject'] = "Terminal SMTP Debug Test"
msg['From'] = smtp_from
msg['To'] = to_email
msg['Date'] = formatdate(localtime=True)           # ← fixes MISSING_DATE
msg['Message-ID'] = make_msgid(domain="linksprig.com")  # ← fixes INVALID_MSGID
msg.set_content("If you are reading this, the terminal test worked!")

try:
    print(f"➔ Connecting to {smtp_host} on port {smtp_port}...")
    server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
    server.set_debuglevel(1)
    server.starttls()
    print("➔ Attempting to log in...")
    server.login(smtp_user, smtp_pass)
    print("➔ Sending email...")
    server.send_message(msg)
    server.quit()
    print("\n✅ SUCCESS: The mail server accepted the message!")
except Exception as e:
    print(f"\n❌ FAILED: {e}")