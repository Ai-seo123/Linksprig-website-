import logging
import os
import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

logger = logging.getLogger(__name__)


def _as_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def send_password_reset_email(to_email: str, first_name: str, reset_url: str) -> bool:
    """
    Send the password reset email via SMTP.
    Returns True on success, False on failure.
    """
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_use_tls = _as_bool(os.getenv("SMTP_USE_TLS", "true"), default=True)
    smtp_use_ssl = _as_bool(os.getenv("SMTP_USE_SSL", "false"), default=False)
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()
    smtp_from_name = os.getenv("SMTP_FROM_NAME", "Linked Dashboard").strip()

    required_values = [smtp_host, smtp_from_email]
    if not all(required_values):
        logger.error("SMTP config is incomplete. Check SMTP_HOST and SMTP_FROM_EMAIL in .env.")
        return False

    greeting_name = (first_name or "there").strip()
    subject = "Reset your password"

    text_body = (
        f"Hi {greeting_name},\n\n"
        "We received a request to reset your password.\n"
        f"Use this link to reset it: {reset_url}\n\n"
        "This link expires in 1 hour.\n\n"
        "If you did not request this, you can ignore this email."
    )
    html_body = f"""
    <html>
      <body>
        <p>Hi {greeting_name},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="{reset_url}">Click here to reset your password</a></p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </body>
    </html>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{smtp_from_name} <{smtp_from_email}>"
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="linksprig.com")
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        if smtp_use_ssl:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
                if smtp_username and smtp_password:
                    server.login(smtp_username, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                if smtp_use_tls:
                    server.starttls()
                if smtp_username and smtp_password:
                    server.login(smtp_username, smtp_password)
                server.send_message(msg)

        return True
    except Exception as exc:
        logger.exception("Failed to send password reset email: %s", exc)
        return False
