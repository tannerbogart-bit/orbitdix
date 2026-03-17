import os
import sqlite3

import sqlalchemy as sa
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy.engine import Engine

from .db import db, migrate, PROD_POOL_OPTIONS

# Enable FK enforcement for every SQLite connection (module-level so it
# fires before the app context exists)
@sa.event.listens_for(Engine, "connect")
def _set_sqlite_pragma(conn, _record):
    if isinstance(conn, sqlite3.Connection):
        conn.execute("PRAGMA foreign_keys = ON")


def create_app():
    load_dotenv()

    app = Flask(__name__)

    db_url = os.getenv("DATABASE_URL", "sqlite:///orbitsix.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    # SECRET_KEY protects Flask session cookies (used for OAuth CSRF state)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-session-secret-change-me")
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    if not db_url.startswith("sqlite"):
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = PROD_POOL_OPTIONS

    # Allow Vite dev server + Chrome extension (any extension ID)
    CORS(app, origins=[
        "http://localhost:5173",
        r"chrome-extension://.*",
    ], supports_credentials=True, allow_headers=["Content-Type", "Authorization"])
    db.init_app(app)
    migrate.init_app(app, db)
    jwt = JWTManager(app)

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        print(f"[JWT] Invalid token: {reason}")
        return jsonify(error=f"Invalid token: {reason}"), 422

    @jwt.expired_token_loader
    def expired_token_callback(_header, _payload):
        print("[JWT] Token has expired")
        return jsonify(error="Token has expired"), 401

    from .models import Person, Edge, Tenant, User  # noqa: F401 — registers models with SQLAlchemy

    from .auth import bp as auth_bp
    from .intro_path import bp as intro_path_bp
    from .oauth import bp as oauth_bp
    from .people import bp as people_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(intro_path_bp)
    app.register_blueprint(oauth_bp)
    app.register_blueprint(people_bp)

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    return app
