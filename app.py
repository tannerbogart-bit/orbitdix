import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from .db import db, migrate

def create_app():
    load_dotenv()

    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///instance/orbitsix.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    migrate.init_app(app, db)

    # Ensure models are registered for migrations
    from . import models  # noqa: F401

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    return app