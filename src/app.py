import os
import sqlite3
from datetime import timedelta

import sqlalchemy as sa
from dotenv import load_dotenv
import pathlib

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
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

    db_url = os.getenv("DATABASE_URL", "")
    # For SQLite with a relative path, resolve to project root / instance so it
    # works regardless of the working directory of the Flask process.
    if not db_url or db_url == "sqlite:///orbitsix.db" or db_url == "sqlite:///instance/orbitsix.db":
        project_root = pathlib.Path(__file__).resolve().parent.parent
        db_path = project_root / "instance" / "orbitsix.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        db_url = "sqlite:///" + str(db_path).replace("\\", "/")
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    is_sqlite = db_url.startswith("sqlite")
    jwt_secret = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me" if is_sqlite else "")
    secret_key = os.getenv("SECRET_KEY",     "dev-session-secret-change-me" if is_sqlite else "")
    if not jwt_secret:
        raise RuntimeError("JWT_SECRET_KEY environment variable must be set in production")
    if not secret_key:
        raise RuntimeError("SECRET_KEY environment variable must be set in production")
    app.config["JWT_SECRET_KEY"] = jwt_secret
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
    # SECRET_KEY protects Flask session cookies (used for OAuth CSRF state)
    app.config["SECRET_KEY"] = secret_key
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"]   = not db_url.startswith("sqlite")  # HTTPS only in production

    if not db_url.startswith("sqlite"):
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = PROD_POOL_OPTIONS

    # Allow Vite dev server + the specific Chrome extension (ID from env)
    allowed_origins = ["http://localhost:5173", "http://localhost:5174"]
    ext_id = os.getenv("CHROME_EXTENSION_ID", "")
    if ext_id:
        allowed_origins.append(f"chrome-extension://{ext_id}")
    CORS(app, origins=allowed_origins,
         supports_credentials=True, allow_headers=["Content-Type", "Authorization"])
    db.init_app(app)
    migrate.init_app(app, db)
    jwt = JWTManager(app)

    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=[],
        storage_uri="memory://",
    )

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        print(f"[JWT] Invalid token: {reason}")
        return jsonify(error=f"Invalid token: {reason}"), 422

    @jwt.expired_token_loader
    def expired_token_callback(_header, _payload):
        print("[JWT] Token has expired")
        return jsonify(error="Token has expired"), 401

    from .models import Person, Edge, Tenant, User, SavedPath, Activity, AgentContext, TargetAccount, Outreach  # noqa: F401 — registers models with SQLAlchemy

    from .agent import bp as agent_bp
    from .ai import bp as ai_bp
    from .auth import bp as auth_bp
    from .billing import bp as billing_bp
    from .digest import bp as digest_bp
    from .intro_path import bp as intro_path_bp
    from .oauth import bp as oauth_bp
    from .outreach import bp as outreach_bp
    from .people import bp as people_bp
    from .saved_paths import bp as saved_paths_bp

    app.register_blueprint(agent_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(billing_bp)
    app.register_blueprint(digest_bp)
    app.register_blueprint(intro_path_bp)
    app.register_blueprint(oauth_bp)
    app.register_blueprint(outreach_bp)
    app.register_blueprint(people_bp)
    app.register_blueprint(saved_paths_bp)

    # Rate-limit sensitive auth endpoints (10 req/min per IP)
    # Must run after register_blueprint so view_functions are populated on the app
    limiter.limit("10 per minute")(auth_bp)
    # Tighter limit on forgot-password — prevents email enumeration + spam
    limiter.limit("3 per minute; 10 per hour")(app.view_functions["auth.forgot_password"])

    @app.get("/health")
    def health():
        try:
            db.session.execute(sa.text("SELECT 1"))
            return jsonify(status="ok", db="ok")
        except Exception as e:
            return jsonify(status="error", db=str(e)), 503

    # Serve built React frontend in production
    frontend_dist = pathlib.Path(app.root_path).parent / "frontend" / "dist"
    if frontend_dist.exists():
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            file_path = frontend_dist / path
            if path and file_path.exists():
                return send_from_directory(frontend_dist, path)
            return send_from_directory(frontend_dist, "index.html")

    return app
