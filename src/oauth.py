"""
src/oauth.py — OAuth2 authentication for LinkedIn, Google, and Microsoft.

Flow:
  1. GET /api/auth/<provider>/login
       Generates a CSRF state token, stores it in the server-side session,
       then redirects the browser to the provider's authorization URL.

  2. GET /api/auth/<provider>/callback
       Validates the state, exchanges the code for an access token,
       fetches the user's profile, creates or finds a User+Tenant+Person,
       issues a JWT, and redirects to the frontend callback page.

The JWT is passed to the frontend via a URL fragment (never a query param so
it is never logged by servers):
  {FRONTEND_URL}/auth/oauth-callback#token=<jwt>&user_id=<id>&tenant_id=<id>
"""

import os
import secrets

from authlib.integrations.requests_client import OAuth2Session
from flask import Blueprint, current_app, jsonify, redirect, request, session
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

from .db import db
from .models import Person, Tenant, User

bp = Blueprint("oauth", __name__)

# ── Provider registry ─────────────────────────────────────────────────────────

def _provider_cfg(provider: str) -> dict | None:
    """Return config dict for a provider, or None if unknown."""
    base = os.getenv("OAUTH_REDIRECT_BASE", "http://localhost:5000")
    registry = {
        "linkedin": {
            "client_id":     os.getenv("LINKEDIN_CLIENT_ID", ""),
            "client_secret": os.getenv("LINKEDIN_CLIENT_SECRET", ""),
            "authorize_url": "https://www.linkedin.com/oauth/v2/authorization",
            "token_url":     "https://www.linkedin.com/oauth/v2/accessToken",
            # LinkedIn OpenID Connect — returns OIDC userinfo-compatible payload
            "scope":         "openid profile email",
            "profile_url":   "https://api.linkedin.com/v2/userinfo",
        },
        "google": {
            "client_id":     os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url":     "https://oauth2.googleapis.com/token",
            "scope":         "openid email profile",
            "profile_url":   "https://www.googleapis.com/oauth2/v3/userinfo",
            "extra_params":  {"access_type": "offline"},
        },
        "microsoft": {
            "client_id":     os.getenv("MICROSOFT_CLIENT_ID", ""),
            "client_secret": os.getenv("MICROSOFT_CLIENT_SECRET", ""),
            "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "token_url":     "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            "scope":         "openid email profile User.Read",
            "profile_url":   "https://graph.microsoft.com/v1.0/me",
        },
    }
    cfg = registry.get(provider)
    if cfg is None:
        return None
    cfg["redirect_uri"] = f"{base}/api/auth/{provider}/callback"
    return cfg


# ── Profile normalisation ─────────────────────────────────────────────────────

def _normalize(provider: str, raw: dict) -> dict:
    """
    Flatten provider-specific profile payloads into a consistent dict:
      email, first_name, last_name, linkedin_url
    """
    if provider in ("linkedin", "google"):
        name_parts = (raw.get("name") or "").split()
        return {
            "email":        raw.get("email"),
            "first_name":   raw.get("given_name") or (name_parts[0] if name_parts else ""),
            "last_name":    raw.get("family_name") or (" ".join(name_parts[1:]) if len(name_parts) > 1 else ""),
            "linkedin_url": (
                f"https://www.linkedin.com/in/{raw['sub']}"
                if provider == "linkedin" and raw.get("sub")
                else None
            ),
        }

    # Microsoft Graph /me
    name_parts = (raw.get("displayName") or "").split()
    return {
        "email":        raw.get("mail") or raw.get("userPrincipalName"),
        "first_name":   raw.get("givenName") or (name_parts[0] if name_parts else ""),
        "last_name":    raw.get("surname") or (" ".join(name_parts[1:]) if len(name_parts) > 1 else ""),
        "linkedin_url": None,
    }


# ── find-or-create helper ─────────────────────────────────────────────────────

def _find_or_create_user(profile: dict) -> User:
    """Return an existing User or create Tenant + User + self-Person from profile."""
    email = profile["email"]
    user = User.query.filter_by(email=email).first()

    if user is not None:
        # Backfill linkedin_url if we now have it (e.g. first logged in via Google)
        if profile.get("linkedin_url"):
            self_p = Person.query.filter_by(user_id=user.id, is_self=True).first()
            if self_p and not self_p.linkedin_url:
                self_p.linkedin_url = profile["linkedin_url"]
                db.session.commit()
        return user

    # New user — build tenant name from profile
    full_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
    tenant = Tenant(name=full_name or email.split("@")[0])
    db.session.add(tenant)
    db.session.flush()

    # OAuth users get an unusable random password hash; they log in via provider only.
    user = User(
        tenant_id=tenant.id,
        email=email,
        password_hash=generate_password_hash(secrets.token_hex(32)),
        role="owner",
        email_verified=True,  # OAuth providers verify email
    )
    db.session.add(user)
    db.session.flush()

    self_person = Person(
        tenant_id=tenant.id,
        user_id=user.id,
        is_self=True,
        first_name=profile.get("first_name"),
        last_name=profile.get("last_name"),
        email=email,
        linkedin_url=profile.get("linkedin_url"),
    )
    db.session.add(self_person)
    db.session.commit()
    return user


# ── Routes ────────────────────────────────────────────────────────────────────

@bp.get("/api/auth/<provider>/login")
def oauth_login(provider):
    cfg = _provider_cfg(provider)
    if cfg is None:
        return jsonify(error=f"Unknown provider: {provider}"), 404

    if not cfg["client_id"]:
        return jsonify(
            error=f"{provider.title()} OAuth is not configured on this server. "
                  f"Set {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET in .env."
        ), 503

    state = secrets.token_urlsafe(32)
    session["oauth_state"]    = state
    session["oauth_provider"] = provider

    client = OAuth2Session(
        client_id=cfg["client_id"],
        redirect_uri=cfg["redirect_uri"],
        scope=cfg["scope"],
    )
    extra = cfg.get("extra_params", {})
    url, _ = client.create_authorization_url(cfg["authorize_url"], state=state, **extra)
    return redirect(url)


@bp.get("/api/auth/<provider>/callback")
def oauth_callback(provider):
    cfg = _provider_cfg(provider)
    if cfg is None:
        return jsonify(error=f"Unknown provider: {provider}"), 404

    # ── CSRF state validation ─────────────────────────────────────────────────
    expected = session.pop("oauth_state", None)
    received = request.args.get("state")
    if not expected or expected != received:
        return jsonify(error="Invalid OAuth state — possible CSRF"), 400

    # ── Provider-level errors (user denied access, etc.) ─────────────────────
    if request.args.get("error"):
        desc = request.args.get("error_description", "")
        return jsonify(error=f"OAuth error: {request.args['error']} — {desc}"), 400

    # ── Code → token exchange ────────────────────────────────────────────────
    client = OAuth2Session(
        client_id=cfg["client_id"],
        client_secret=cfg["client_secret"],
        redirect_uri=cfg["redirect_uri"],
    )
    try:
        client.fetch_token(
            cfg["token_url"],
            authorization_response=request.url,
            code=request.args.get("code"),
        )
    except Exception as exc:
        current_app.logger.error("OAuth token exchange failed (%s): %s", provider, exc)
        return jsonify(error="Token exchange failed"), 502

    # ── Fetch profile ─────────────────────────────────────────────────────────
    try:
        resp = client.get(cfg["profile_url"])
        resp.raise_for_status()
        raw = resp.json()
    except Exception as exc:
        current_app.logger.error("OAuth profile fetch failed (%s): %s", provider, exc)
        return jsonify(error="Profile fetch failed"), 502

    profile = _normalize(provider, raw)
    if not profile.get("email"):
        return jsonify(error="OAuth provider did not return an email address"), 400

    # ── Find or create user ───────────────────────────────────────────────────
    user = _find_or_create_user(profile)

    # ── Issue JWT and send to frontend ────────────────────────────────────────
    access_token = create_access_token(identity=str(user.id))
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return redirect(
        f"{frontend_url}/auth/oauth-callback"
        f"#token={access_token}"
        f"&user_id={user.id}"
        f"&tenant_id={user.tenant_id}"
    )


# ── Utility: list configured providers (for frontend feature detection) ────────

@bp.get("/api/auth/providers")
def list_providers():
    """Returns which providers are configured so the frontend can show/hide buttons."""
    configured = []
    for name in ("linkedin", "google", "microsoft"):
        cfg = _provider_cfg(name)
        if cfg and cfg["client_id"]:
            configured.append(name)
    return jsonify(providers=configured)
