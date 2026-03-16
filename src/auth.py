from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

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

    access_token = create_access_token(identity=user.id)
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

    access_token = create_access_token(identity=user.id)
    return jsonify(access_token=access_token)


@bp.get("/api/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    self_person = Person.query.filter_by(user_id=user.id, is_self=True).first()
    return jsonify(
        user={"id": user.id, "email": user.email, "role": user.role},
        tenant={"id": user.tenant.id, "name": user.tenant.name},
        self_person_id=self_person.id if self_person else None,
    )
