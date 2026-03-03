"""Simple SMTP email client for OTP and notifications."""
from email.message import EmailMessage
import smtplib

from app.core.config import settings


def send_email(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    """Send an email (text + optional HTML) using configured SMTP settings."""
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("SMTP is not configured. Please set SMTP_* env variables.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to_email
    msg.set_content(text_body)

    if html_body is not None:
        msg.add_alternative(html_body, subtype="html")

    if settings.smtp_use_tls:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)


def send_otp_email(to_email: str, otp_code: str, purpose: str) -> None:
    subjects = {
        "signup": "Mã xác minh đăng ký tài khoản",
        "reset_password": "Mã xác minh đặt lại mật khẩu",
        "login": "Mã xác minh đăng nhập",
    }
    subject = subjects.get(purpose, "Mã xác minh")

    text_body = (
        "Xin chào,\n\n"
        f"Mã xác minh HealthOS của bạn là: {otp_code}\n"
        "Mã này có hiệu lực trong 5 phút.\n\n"
        "Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này."
    )

    html_body = f"""
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"></head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin: 0 0 16px 0;">{subject}</h2>
      <p>Xin chào,</p>
      <p>Mã xác minh HealthOS của bạn là:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e40af;">{otp_code}</span>
      </div>
      <p>Mã này có hiệu lực trong <strong>5 phút</strong>.</p>
      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">
      <p style="font-size: 12px; color: #6b7280;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </body>
</html>
""".strip()

    send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)

