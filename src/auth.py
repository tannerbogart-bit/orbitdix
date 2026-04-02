import os
from datetime import datetime, timezone, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from .email import send_password_reset, send_verification_email, send_welcome_email
from .models import Person, Tenant, User, db

bp = Blueprint("auth", __name__)


def _validate_password(password: str) -> str | None:
    """Return an error string if password fails policy, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not any(c.isalpha() for c in password):
        return "Password must contain at least one letter"
    if not any(c.isdigit() for c in password) and not any(not c.isalnum() for c in password):
        return "Password must contain at least one number or special character"
    return None


@bp.post("/api/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}
    tenant_name = data.get("tenant_name")
    email = data.get("email")
    password = data.get("password")

    if not tenant_name or not email or not password:
        return jsonify(error="tenant_name, email, and password are required"), 400

    if not data.get("agreed_to_terms"):
        return jsonify(error="You must agree to the Terms of Service and Privacy Policy"), 400

    pw_error = _validate_password(password)
    if pw_error:
        return jsonify(error=pw_error), 400

    if User.query.filter_by(email=email).first():
        return jsonify(error="Email already registered"), 409

    tenant = Tenant(name=tenant_name)
    db.session.add(tenant)
    db.session.flush()  # get tenant.id before commit

    # Record consent with timestamp, ToS version, and signup IP for legal proof
    signup_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
    user = User(
        tenant_id=tenant.id,
        email=email,
        password_hash=generate_password_hash(password),
        role="owner",
        agreed_to_terms_at=datetime.now(timezone.utc),
        terms_version="2026-03-26",
        signup_ip=signup_ip or None,
    )
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    self_person = Person(
        tenant_id=tenant.id,
        user_id=user.id,
        is_self=True,
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        email=email,
    )
    db.session.add(self_person)
    db.session.commit()

    access_token  = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=24))
    refresh_token = create_refresh_token(identity=str(user.id))

    # Send emails (non-blocking — failure doesn't break signup)
    _send_verification(user, current_app)
    try:
        send_welcome_email(user.email, data.get("first_name", ""))
    except Exception:
        pass

    return (
        jsonify(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user.id,
            tenant_id=tenant.id,
            person_id=self_person.id,
        ),
        201,
    )


@bp.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify(error="email and password are required"), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify(error="Invalid credentials"), 401

    access_token  = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=24))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify(access_token=access_token, refresh_token=refresh_token)


@bp.post("/api/auth/refresh")
@jwt_required(refresh=True)
def refresh_token_endpoint():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id, expires_delta=timedelta(hours=24))
    return jsonify(access_token=access_token)


def _send_verification(user, app):
    """Generate a verification token and email it. Dev mode: print link."""
    s = URLSafeTimedSerializer(app.config["SECRET_KEY"])
    token = s.dumps(user.email, salt="email-verify")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verify_link = f"{frontend_url}/auth/verify-email?token={token}"
    sent = send_verification_email(user.email, verify_link)
    if not sent:
        print(f"[DEV] Email verification link: {verify_link}", flush=True)
    return verify_link


@bp.get("/api/auth/verify-email")
def verify_email():
    token = request.args.get("token", "")
    if not token:
        return jsonify(error="token is required"), 400

    s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    try:
        email = s.loads(token, salt="email-verify", max_age=86400)  # 24 hours
    except SignatureExpired:
        return jsonify(error="Verification link has expired. Please request a new one."), 400
    except BadSignature:
        return jsonify(error="Invalid verification link."), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error="User not found"), 404

    user.email_verified = True
    db.session.commit()
    return jsonify(message="Email verified. You're all set!")


@bp.post("/api/auth/resend-verification")
@jwt_required()
def resend_verification():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404
    if user.email_verified:
        return jsonify(message="Email is already verified.")

    _send_verification(user, current_app)
    return jsonify(message="Verification email sent.")


@bp.post("/api/auth/change-password")
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password")
    new_password     = data.get("new_password")

    if not current_password or not new_password:
        return jsonify(error="current_password and new_password are required"), 400

    if not check_password_hash(user.password_hash, current_password):
        return jsonify(error="Current password is incorrect"), 401

    if len(new_password) < 8:
        return jsonify(error="New password must be at least 8 characters"), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify(message="Password updated successfully")


@bp.post("/api/auth/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify(error="email is required"), 400

    user = User.query.filter_by(email=email).first()
    resp = {"message": "If that email is registered, you'll receive a reset link."}

    if user:
        s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
        token = s.dumps(email, salt="password-reset")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/auth/reset-password?token={token}"

        sent = send_password_reset(email, reset_link)
        if not sent:
            # No email provider configured — log to server console only, never in response
            print(f"[DEV] Password reset link: {reset_link}", flush=True)

    return jsonify(**resp)


@bp.post("/api/auth/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify(error="token and new_password are required"), 400

    s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    try:
        email = s.loads(token, salt="password-reset", max_age=3600)
    except SignatureExpired:
        return jsonify(error="Reset link has expired. Please request a new one."), 400
    except BadSignature:
        return jsonify(error="Invalid reset link."), 400

    pw_error = _validate_password(new_password)
    if pw_error:
        return jsonify(error=pw_error), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(error="User not found"), 404

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify(message="Password updated. You can now sign in.")


@bp.get("/api/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    self_person = Person.query.filter_by(user_id=user.id, is_self=True).first()
    return jsonify(
        user={"id": user.id, "email": user.email, "role": user.role, "email_verified": user.email_verified},
        tenant={"id": user.tenant.id, "name": user.tenant.name},
        self_person_id=self_person.id if self_person else None,
        first_name=self_person.first_name   if self_person else None,
        last_name=self_person.last_name     if self_person else None,
        title=self_person.title             if self_person else None,
        company=self_person.company         if self_person else None,
        linkedin_url=self_person.linkedin_url if self_person else None,
    )


@bp.put("/api/me")
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}
    first_name   = data.get("first_name", "").strip()
    last_name    = data.get("last_name",  "").strip()
    title        = data.get("title",        "").strip()
    company      = data.get("company",      "").strip()
    linkedin_url = data.get("linkedin_url", "").strip()

    if not first_name:
        return jsonify(error="First name is required"), 400

    self_person = Person.query.filter_by(user_id=user.id, is_self=True).first()
    if self_person:
        self_person.first_name   = first_name
        self_person.last_name    = last_name
        self_person.title        = title        or None
        self_person.company      = company      or None
        self_person.linkedin_url = linkedin_url or None
        db.session.commit()

    return jsonify(
        first_name=first_name, last_name=last_name,
        title=title, company=company, linkedin_url=linkedin_url,
    )
