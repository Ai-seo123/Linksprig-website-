import smtplib
import os
from email.message import EmailMessage
from dotenv import load_dotenv

# Load your existing .env file
load_dotenv()

smtp_host = os.getenv("SMTP_HOST")
smtp_port = int(os.getenv("SMTP_PORT", 587))
smtp_user = os.getenv("SMTP_USERNAME")
smtp_pass = os.getenv("SMTP_PASSWORD")
smtp_from = os.getenv("SMTP_FROM_EMAIL")

# Change this to the email address you want to receive the test
to_email = "arnavrocks1108@gmail.com" 

msg = EmailMessage()
msg['Subject'] = "Terminal SMTP Debug Test"
msg['From'] = smtp_from
msg['To'] = to_email
msg.set_content("If you are reading this, the terminal test worked!")

try:
    print(f"➔ Connecting to {smtp_host} on port {smtp_port}...")
    server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
    
    # THIS IS THE MAGIC LINE: It prints the raw server logs to your terminal
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