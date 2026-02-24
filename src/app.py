import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from src.models import db


def create_app():
    load_dotenv()
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///orbitdix.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")

    db.init_app(app)
    Migrate(app, db)
    JWTManager(app)

    from src.auth import bp as auth_bp
    from src.intro_path import bp as intro_path_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(intro_path_bp)

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    return app
