import os
from collections import deque

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager

import sqlite3

import sqlalchemy as sa
from sqlalchemy.engine import Engine

from .db import db, migrate, PROD_POOL_OPTIONS

# Enable FK enforcement for every SQLite connection (must be module-level so it
# fires before the app context exists, which is when Flask-SQLAlchemy creates engines)
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

    # Apply production pool settings for non-SQLite databases
    if not db_url.startswith("sqlite"):
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = PROD_POOL_OPTIONS

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    JWTManager(app)

    from .models import Person, Edge, Tenant, User  # noqa: F401

    from .auth import bp as auth_bp
    from .intro_path import bp as intro_path_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(intro_path_bp)

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    # ── People ────────────────────────────────────────────────────────────────

    @app.get("/api/people")
    def list_people():
        people = Person.query.order_by(Person.id.asc()).all()
        return jsonify(
            [
                {"id": p.id, "first_name": p.first_name, "last_name": p.last_name}
                for p in people
            ]
        )

    @app.post("/api/people")
    def create_person():
        data = request.get_json(silent=True) or {}
        first = (data.get("first_name") or "").strip()
        last = (data.get("last_name") or "").strip()

        if not first or not last:
            return jsonify(error="first_name and last_name are required"), 400

        p = Person(first_name=first, last_name=last)
        db.session.add(p)
        db.session.commit()
        return jsonify(id=p.id, first_name=p.first_name, last_name=p.last_name), 201

    @app.delete("/api/people/<int:person_id>")
    def delete_person(person_id):
        p = Person.query.get_or_404(person_id)
        Edge.query.filter(
            (Edge.from_person_id == person_id) | (Edge.to_person_id == person_id)
        ).delete()
        db.session.delete(p)
        db.session.commit()
        return "", 204

    # ── Edges ─────────────────────────────────────────────────────────────────

    @app.get("/api/edges")
    def list_edges():
        edges = Edge.query.all()
        return jsonify(
            [
                {
                    "id": e.id,
                    "from_person_id": e.from_person_id,
                    "to_person_id": e.to_person_id,
                }
                for e in edges
            ]
        )

    @app.post("/api/edges")
    def create_edge():
        data = request.get_json(silent=True) or {}
        from_id = data.get("from_person_id")
        to_id = data.get("to_person_id")

        if not from_id or not to_id:
            return jsonify(error="from_person_id and to_person_id are required"), 400
        if from_id == to_id:
            return jsonify(error="cannot connect a person to themselves"), 400
        if not Person.query.get(from_id) or not Person.query.get(to_id):
            return jsonify(error="person not found"), 404

        e = Edge(from_person_id=from_id, to_person_id=to_id)
        db.session.add(e)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            return jsonify(error="edge already exists"), 409

        return (
            jsonify(
                id=e.id,
                from_person_id=e.from_person_id,
                to_person_id=e.to_person_id,
            ),
            201,
        )

    @app.delete("/api/edges/<int:edge_id>")
    def delete_edge(edge_id):
        e = Edge.query.get_or_404(edge_id)
        db.session.delete(e)
        db.session.commit()
        return "", 204

    # ── Path finding (BFS, undirected) ────────────────────────────────────────

    @app.get("/api/path")
    def find_path():
        try:
            from_id = int(request.args.get("from", 0))
            to_id = int(request.args.get("to", 0))
        except ValueError:
            return jsonify(error="invalid id"), 400

        if not from_id or not to_id:
            return jsonify(error="from and to query params are required"), 400

        if from_id == to_id:
            return jsonify(path=[from_id], degrees=0)

        edges = Edge.query.all()
        graph: dict[int, list[int]] = {}
        for e in edges:
            graph.setdefault(e.from_person_id, []).append(e.to_person_id)
            graph.setdefault(e.to_person_id, []).append(e.from_person_id)

        queue: deque[list[int]] = deque([[from_id]])
        visited = {from_id}

        while queue:
            path = queue.popleft()
            node = path[-1]
            for neighbor in graph.get(node, []):
                if neighbor == to_id:
                    full_path = path + [neighbor]
                    return jsonify(path=full_path, degrees=len(full_path) - 1)
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path + [neighbor])

        return jsonify(path=None, degrees=None, message="No path found")

    return app
