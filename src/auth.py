import os

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from .email import send_password_reset
from .models import Person, Tenant, User, db

bp = Blueprint("auth", __name__)


@bp.post("/api/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}
    tenant_name = data.get("tenant_name")
    email = data.get("email")
    password = data.get("password")

    if not tenant_name or not email or not password:
        return jsonify(error="tenant_name, email, and password are required"), 400

    if User.query.filter_by(email=email).first():
        return jsonify(error="Email already registered"), 409

    tenant = Tenant(name=tenant_name)
    db.session.add(tenant)
    db.session.flush()  # get tenant.id before commit

    user = User(
        tenant_id=tenant.id,
        email=email,
        password_hash=generate_password_hash(password),
        role="owner",
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

    access_token = create_access_token(identity=str(user.id))
    return (
        jsonify(
            access_token=access_token,
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

    access_token = create_access_token(identity=str(user.id))
    return jsonify(access_token=access_token)


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
            # No email provider configured — surface the link in dev
            print(f"[DEV] Password reset link: {reset_link}", flush=True)
            if current_app.debug:
                resp["dev_reset_link"] = reset_link

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
        user={"id": user.id, "email": user.email, "role": user.role},
        tenant={"id": user.tenant.id, "name": user.tenant.name},
        self_person_id=self_person.id if self_person else None,
    )
