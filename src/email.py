"""
src/email.py — Transactional email via Resend.

Set RESEND_API_KEY in .env to enable real email sending.
Set FROM_EMAIL to your verified sender (default: noreply@yourdomain.com).

In dev (no RESEND_API_KEY), emails are skipped and the reset link is
returned in the API response body instead.
"""

import os


def send_welcome_email(to_email: str, first_name: str) -> bool:
    """Send a welcome email after signup."""
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        return False

    try:
        import resend
        resend.api_key = api_key

        from_email = os.getenv("FROM_EMAIL", "OrbitSix <noreply@orbitsix.com>")
        app_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": "Welcome to OrbitSix 👋",
            "html": _welcome_email_html(first_name, app_url),
        })
        return True
    except Exception as e:
        print(f"[email] Failed to send welcome email: {e}", flush=True)
        return False


def send_password_reset(to_email: str, reset_link: str) -> bool:
    """
    Send a password reset email.
    Returns True if sent, False if skipped (dev mode / not configured).
    """
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        return False

    try:
        import resend
        resend.api_key = api_key

        from_email = os.getenv("FROM_EMAIL", "OrbitSix <noreply@orbitsix.com>")
        app_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": "Reset your OrbitSix password",
            "html": _reset_email_html(reset_link, app_url),
        })
        return True
    except Exception as e:
        print(f"[email] Failed to send reset email: {e}", flush=True)
        return False


def send_verification_email(to_email: str, verify_link: str) -> bool:
    """
    Send an email verification link.
    Returns True if sent, False if skipped (dev mode / not configured).
    """
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        return False

    try:
        import resend
        resend.api_key = api_key

        from_email = os.getenv("FROM_EMAIL", "OrbitSix <noreply@orbitsix.com>")
        app_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": "Verify your OrbitSix email",
            "html": _verify_email_html(verify_link, app_url),
        })
        return True
    except Exception as e:
        print(f"[email] Failed to send verification email: {e}", flush=True)
        return False


def send_digest_email(to_email: str, first_name: str, highlights: dict) -> bool:
    """
    Send a weekly re-engagement digest.
    highlights = {
        top_target: str,          # company name with most bridges
        bridge_count: int,        # number of bridge contacts into top_target
        new_contacts: int,        # contacts added in last 7 days
        total_contacts: int,
    }
    """
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        return False

    try:
        import resend
        resend.api_key = api_key

        from_email = os.getenv("FROM_EMAIL", "OrbitSix <noreply@orbitsix.com>")
        app_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": f"Your network update — {highlights.get('new_contacts', 0)} new connections this week",
            "html": _digest_email_html(first_name, highlights, app_url),
        })
        return True
    except Exception as e:
        print(f"[email] Failed to send digest email: {e}", flush=True)
        return False


def _welcome_email_html(first_name: str, app_url: str) -> str:
    name = first_name or "there"
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f14;font-family:'DM Sans',Arial,sans-serif;color:#e2e2e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f14;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:16px;padding:40px 36px;">
        <tr><td>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#7c6ee0;width:36px;height:36px;border-radius:9px;text-align:center;vertical-align:middle;">
                <span style="color:#fff;font-size:18px;font-weight:bold;">⬡</span>
              </td>
              <td style="padding-left:10px;font-size:18px;font-weight:700;color:#e2e2e8;vertical-align:middle;">OrbitSix</td>
            </tr>
          </table>
          <h1 style="font-size:24px;font-weight:700;color:#e2e2e8;margin:0 0 12px;">Welcome, {name} 👋</h1>
          <p style="font-size:15px;color:#8888a8;line-height:1.6;margin:0 0 28px;">
            You're in. OrbitSix maps your professional network so you can reach anyone through a warm introduction — no cold outreach needed.
          </p>
          <p style="font-size:14px;font-weight:600;color:#e2e2e8;margin:0 0 14px;">Get started in 3 steps:</p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a3e;">
              <span style="color:#7c6ee0;font-weight:700;">1.</span>
              <span style="color:#e2e2e8;margin-left:8px;">Import your LinkedIn network</span>
              <span style="color:#8888a8;font-size:13px;margin-left:6px;">— upload a CSV or install the Chrome extension</span>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a3e;">
              <span style="color:#7c6ee0;font-weight:700;">2.</span>
              <span style="color:#e2e2e8;margin-left:8px;">Add your target companies</span>
              <span style="color:#8888a8;font-size:13px;margin-left:6px;">— the companies you want to break into</span>
            </td></tr>
            <tr><td style="padding:10px 0;">
              <span style="color:#7c6ee0;font-weight:700;">3.</span>
              <span style="color:#e2e2e8;margin-left:8px;">Ask your AI agent</span>
              <span style="color:#8888a8;font-size:13px;margin-left:6px;">— it maps your warmest path and drafts the intro</span>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#7c6ee0;border-radius:8px;">
                <a href="{app_url}/dashboard"
                   style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">
                  Go to your dashboard →
                </a>
              </td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #2a2a3e;margin:0 0 24px;">
          <p style="font-size:12px;color:#55556a;margin:0;">
            Questions? Just reply to this email.<br><br>
            <a href="{app_url}" style="color:#55556a;">orbitsix.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _verify_email_html(verify_link: str, app_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f14;font-family:'DM Sans',Arial,sans-serif;color:#e2e2e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f14;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:16px;padding:40px 36px;">
        <tr><td>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#7c6ee0;width:36px;height:36px;border-radius:9px;text-align:center;vertical-align:middle;">
                <span style="color:#fff;font-size:18px;font-weight:bold;">⬡</span>
              </td>
              <td style="padding-left:10px;font-size:18px;font-weight:700;color:#e2e2e8;vertical-align:middle;">OrbitSix</td>
            </tr>
          </table>
          <h1 style="font-size:24px;font-weight:700;color:#e2e2e8;margin:0 0 12px;">Verify your email</h1>
          <p style="font-size:15px;color:#8888a8;line-height:1.6;margin:0 0 32px;">
            Click the button below to verify your email address and activate your OrbitSix account.
            This link expires in <strong style="color:#e2e2e8;">24 hours</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#7c6ee0;border-radius:8px;">
                <a href="{verify_link}"
                   style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">
                  Verify email →
                </a>
              </td>
            </tr>
          </table>
          <p style="font-size:13px;color:#8888a8;margin:0 0 8px;">Or copy this link:</p>
          <p style="font-size:12px;color:#7c6ee0;word-break:break-all;margin:0 0 32px;">
            <a href="{verify_link}" style="color:#7c6ee0;">{verify_link}</a>
          </p>
          <hr style="border:none;border-top:1px solid #2a2a3e;margin:0 0 24px;">
          <p style="font-size:12px;color:#55556a;margin:0;">
            If you didn&apos;t create an OrbitSix account, you can ignore this email.<br><br>
            <a href="{app_url}" style="color:#55556a;">orbitsix.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _reset_email_html(reset_link: str, app_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f14;font-family:'DM Sans',Arial,sans-serif;color:#e2e2e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f14;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:16px;padding:40px 36px;">
        <tr><td>
          <!-- Logo -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#7c6ee0;width:36px;height:36px;border-radius:9px;text-align:center;vertical-align:middle;">
                <span style="color:#fff;font-size:18px;font-weight:bold;">⬡</span>
              </td>
              <td style="padding-left:10px;font-size:18px;font-weight:700;color:#e2e2e8;vertical-align:middle;">OrbitSix</td>
            </tr>
          </table>

          <!-- Heading -->
          <h1 style="font-size:24px;font-weight:700;color:#e2e2e8;margin:0 0 12px;">Reset your password</h1>
          <p style="font-size:15px;color:#8888a8;line-height:1.6;margin:0 0 32px;">
            We received a request to reset the password for your OrbitSix account.
            Click the button below to choose a new password. This link expires in <strong style="color:#e2e2e8;">1 hour</strong>.
          </p>

          <!-- CTA button -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#7c6ee0;border-radius:8px;">
                <a href="{reset_link}"
                   style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">
                  Reset password →
                </a>
              </td>
            </tr>
          </table>

          <!-- Fallback link -->
          <p style="font-size:13px;color:#8888a8;margin:0 0 8px;">Or copy this link into your browser:</p>
          <p style="font-size:12px;color:#7c6ee0;word-break:break-all;margin:0 0 32px;">
            <a href="{reset_link}" style="color:#7c6ee0;">{reset_link}</a>
          </p>

          <!-- Footer -->
          <hr style="border:none;border-top:1px solid #2a2a3e;margin:0 0 24px;">
          <p style="font-size:12px;color:#55556a;margin:0;line-height:1.6;">
            If you didn&apos;t request this, you can safely ignore this email.
            Your password won&apos;t change until you click the link above.<br><br>
            <a href="{app_url}" style="color:#55556a;">orbitsix.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _digest_email_html(first_name: str, highlights: dict, app_url: str) -> str:
    name         = first_name or "there"
    top_target   = highlights.get("top_target", "")
    bridge_count = highlights.get("bridge_count", 0)
    new_contacts = highlights.get("new_contacts", 0)
    total        = highlights.get("total_contacts", 0)

    new_contacts_row = (
        f'<tr><td style="padding:10px 0;border-bottom:1px solid #2a2a3e;">'
        f'<span style="color:#7c6ee0;font-weight:700;">+{new_contacts:,}</span>'
        f'<span style="color:#e2e2e8;margin-left:8px;">new connections added this week</span>'
        f'</td></tr>'
    ) if new_contacts > 0 else ""

    bridge_row = (
        f'<tr><td style="padding:10px 0;border-bottom:1px solid #2a2a3e;">'
        f'<span style="color:#7c6ee0;font-weight:700;">{bridge_count}</span>'
        f'<span style="color:#e2e2e8;margin-left:8px;">warm path{"s" if bridge_count != 1 else ""} into <strong>{top_target}</strong></span>'
        f'<span style="color:#8888a8;font-size:13px;margin-left:6px;">— connections who can intro you</span>'
        f'</td></tr>'
    ) if top_target and bridge_count > 0 else ""

    cta_text = f"Find my path into {top_target} \u2192" if top_target else "Open my agent \u2192"
    preview = (
        f"You have {bridge_count} warm path{'s' if bridge_count != 1 else ''} into {top_target}."
        if top_target and bridge_count > 0
        else f"Your network now has {total:,} connections."
    )

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f14;font-family:'DM Sans',Arial,sans-serif;color:#e2e2e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f14;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:16px;padding:40px 36px;">
        <tr><td>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#7c6ee0;width:36px;height:36px;border-radius:9px;text-align:center;vertical-align:middle;">
                <span style="color:#fff;font-size:18px;font-weight:bold;">\u2b21</span>
              </td>
              <td style="padding-left:10px;font-size:18px;font-weight:700;color:#e2e2e8;vertical-align:middle;">OrbitSix</td>
            </tr>
          </table>
          <h1 style="font-size:22px;font-weight:700;color:#e2e2e8;margin:0 0 8px;">Hey {name}, your network update</h1>
          <p style="font-size:14px;color:#8888a8;line-height:1.6;margin:0 0 28px;">{preview}</p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
            {new_contacts_row}
            {bridge_row}
            <tr><td style="padding:10px 0;">
              <span style="color:#7c6ee0;font-weight:700;">{total:,}</span>
              <span style="color:#e2e2e8;margin-left:8px;">total connections in your network</span>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#7c6ee0;border-radius:8px;">
                <a href="{app_url}/agent" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">
                  {cta_text}
                </a>
              </td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #2a2a3e;margin:0 0 24px;">
          <p style="font-size:12px;color:#55556a;margin:0;line-height:1.6;">
            You're receiving this because you have an OrbitSix account.<br>
            <a href="{app_url}" style="color:#55556a;">orbitsix.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
